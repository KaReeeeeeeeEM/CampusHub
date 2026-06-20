import { randomUUID } from "node:crypto";

import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  assignSuggestionSchema,
  createSuggestionSchema,
  rejectSuggestionSchema,
  resolveSuggestionSchema,
  suggestionCommentSchema,
  suggestionQuerySchema,
  updateSuggestionStatusSchema,
} from "@/features/suggestions/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  SuggestionCommentModel,
  SuggestionModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isRepresentative(actor: AuthUser) {
  return (
    actor.position === "REPRESENTATIVE" ||
    actor.studentLeadershipPositions?.includes("REPRESENTATIVE") ||
    actor.roles?.includes("REPRESENTATIVE")
  );
}

function canReviewSuggestions(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    isRepresentative(actor) ||
    hasPermission(actor, "SUGGESTION_REVIEW")
  );
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function serializeSuggestion(
  suggestion: Record<string, unknown>,
  actor?: AuthUser,
) {
  const anonymous = Boolean(suggestion.anonymous);
  const canSeeAuthor =
    !anonymous ||
    (actor &&
      (canReviewSuggestions(actor) || suggestion.authorId === actor.id));

  return {
    id: String(suggestion._id),
    universityId: String(suggestion.universityId),
    authorId: canSeeAuthor
      ? String(suggestion.authorId ?? suggestion.createdById)
      : null,
    title: String(suggestion.title),
    description: String(suggestion.description),
    category: String(suggestion.category),
    priority: String(suggestion.priority ?? "MEDIUM"),
    anonymous,
    status: String(
      suggestion.status === "IN_REVIEW" ? "UNDER_REVIEW" : suggestion.status,
    ),
    assignedTo:
      typeof suggestion.assignedTo === "string"
        ? suggestion.assignedTo
        : typeof suggestion.assignedToId === "string"
          ? suggestion.assignedToId
          : null,
    resolution:
      typeof suggestion.resolution === "string" ? suggestion.resolution : null,
    rejectedReason:
      typeof suggestion.rejectedReason === "string"
        ? suggestion.rejectedReason
        : null,
    escalatedAt: serializeDate(suggestion.escalatedAt),
    resolvedAt: serializeDate(suggestion.resolvedAt),
    rejectedAt: serializeDate(suggestion.rejectedAt),
    createdAt: serializeDate(suggestion.createdAt),
    updatedAt: serializeDate(suggestion.updatedAt),
  };
}

function serializeComment(comment: Record<string, unknown>) {
  return {
    id: String(comment._id),
    suggestionId: String(comment.suggestionId),
    authorId: String(comment.authorId),
    content: String(comment.content),
    internal: Boolean(comment.internal),
    createdAt: serializeDate(comment.createdAt),
    updatedAt: serializeDate(comment.updatedAt),
  };
}

async function getVisibleSuggestion(suggestionId: string, actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const filter: Record<string, unknown> = {
    _id: suggestionId,
    universityId,
    ...deletedFilter,
  };

  if (!canReviewSuggestions(actor)) {
    filter.authorId = actor.id;
  }

  const suggestion = await SuggestionModel.findOne(filter).lean();
  if (!suggestion) throw notFound("Suggestion not found.");

  return suggestion;
}

async function notifyAuthor(
  suggestion: Record<string, unknown>,
  actor: AuthUser,
  title: string,
  message: string,
) {
  const authorId = String(suggestion.authorId ?? suggestion.createdById);
  if (!authorId || authorId === actor.id) return;

  await createSystemNotification({
    target: { recipientId: authorId },
    senderId: actor.id,
    type: "SUGGESTION",
    title,
    message,
    entityType: "suggestion",
    entityId: String(suggestion._id),
    priority: "NORMAL",
    channels: { inApp: true, email: false, push: false, sms: false },
    metadata: { status: suggestion.status },
  });
}

export async function createSuggestion(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  const payload = createSuggestionSchema.parse(input);
  const suggestion = await SuggestionModel.create({
    _id: randomUUID(),
    universityId,
    createdById: actor.id,
    authorId: actor.id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    anonymous: payload.anonymous,
    attachments: payload.attachments,
    visibility: "UNIVERSITY",
    status: "OPEN",
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "SUGGESTION_CREATED",
    entityType: "suggestion",
    entityId: String(suggestion._id),
    after: serializeSuggestion(suggestion.toObject(), actor),
  });

  return serializeSuggestion(suggestion.toObject(), actor);
}

export async function listSuggestions(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  const filters = suggestionQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };

  if (!canReviewSuggestions(actor) || filters.mine)
    dbFilter.authorId = actor.id;
  if (filters.assignedToMe) dbFilter.assignedToId = actor.id;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.category) dbFilter.category = filters.category;
  if (filters.priority) dbFilter.priority = filters.priority;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const suggestions = await SuggestionModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return suggestions.map((suggestion) =>
    serializeSuggestion(suggestion as Record<string, unknown>, actor),
  );
}

export async function getSuggestion(suggestionId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const suggestion = await getVisibleSuggestion(suggestionId, actor);

  return serializeSuggestion(suggestion as Record<string, unknown>, actor);
}

export async function commentOnSuggestion(
  suggestionId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = suggestionCommentSchema.parse(input);
  const suggestion = await getVisibleSuggestion(suggestionId, actor);

  if (payload.internal && !canReviewSuggestions(actor)) {
    throw forbidden("Only leadership can add internal comments.");
  }

  const comment = await SuggestionCommentModel.create({
    _id: randomUUID(),
    universityId: suggestion.universityId,
    suggestionId,
    authorId: actor.id,
    content: payload.content,
    internal: payload.internal,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(suggestion.universityId),
    action: "SUGGESTION_COMMENTED",
    entityType: "suggestion",
    entityId: suggestionId,
  });
  if (canReviewSuggestions(actor) && !payload.internal) {
    await notifyAuthor(
      suggestion as Record<string, unknown>,
      actor,
      "Suggestion response added",
      "Leadership has responded to your suggestion.",
    );
  }

  return serializeComment(comment.toObject());
}

export async function listSuggestionComments(suggestionId: string) {
  const actor = await requireAuth();
  await connectMongo();
  await getVisibleSuggestion(suggestionId, actor);
  const dbFilter: Record<string, unknown> = {
    suggestionId,
    ...deletedFilter,
  };

  if (!canReviewSuggestions(actor)) dbFilter.internal = false;

  const comments = await SuggestionCommentModel.find(dbFilter)
    .sort({ createdAt: 1 })
    .lean();

  return comments.map((comment) =>
    serializeComment(comment as Record<string, unknown>),
  );
}

export async function assignSuggestion(suggestionId: string, input: unknown) {
  const actor = await requireAuth();
  if (!canReviewSuggestions(actor))
    throw forbidden("Suggestion review access is required.");
  await connectMongo();
  const payload = assignSuggestionSchema.parse(input);
  const suggestion = await getVisibleSuggestion(suggestionId, actor);
  const assignee = await UserModel.findOne({
    _id: payload.assignedTo,
    universityId: suggestion.universityId,
    ...deletedFilter,
  }).lean();

  if (!assignee) throw notFound("Assignee not found.");

  const updated = await SuggestionModel.findOneAndUpdate(
    { _id: suggestionId, ...deletedFilter },
    {
      $set: {
        assignedToId: payload.assignedTo,
        assignedTo: payload.assignedTo,
        status: "UNDER_REVIEW",
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(suggestion.universityId),
    action: "SUGGESTION_ASSIGNED",
    entityType: "suggestion",
    entityId: suggestionId,
    metadata: { assignedTo: payload.assignedTo },
  });
  await notifyAuthor(
    updated as Record<string, unknown>,
    actor,
    "Suggestion assigned",
    "Your suggestion has been assigned for review.",
  );

  return serializeSuggestion(updated as Record<string, unknown>, actor);
}

export async function updateSuggestionStatus(
  suggestionId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  if (!canReviewSuggestions(actor))
    throw forbidden("Suggestion review access is required.");
  await connectMongo();
  const payload = updateSuggestionStatusSchema.parse(input);
  const suggestion = await getVisibleSuggestion(suggestionId, actor);
  const update: Record<string, unknown> = {
    status: payload.status,
    updatedById: actor.id,
  };

  if (payload.status === "IN_PROGRESS") update.escalatedAt = null;
  if (payload.status === "RESOLVED") update.resolvedAt = new Date();
  if (payload.status === "REJECTED") update.rejectedAt = new Date();

  const updated = await SuggestionModel.findOneAndUpdate(
    { _id: suggestionId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  if (payload.response) {
    await commentOnSuggestion(suggestionId, {
      content: payload.response,
      internal: false,
    });
  }
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(suggestion.universityId),
    action: "SUGGESTION_STATUS_UPDATED",
    entityType: "suggestion",
    entityId: suggestionId,
    metadata: { status: payload.status },
  });
  await notifyAuthor(
    updated as Record<string, unknown>,
    actor,
    "Suggestion status updated",
    `Your suggestion status is now ${payload.status}.`,
  );

  return serializeSuggestion(updated as Record<string, unknown>, actor);
}

export async function escalateSuggestion(suggestionId: string) {
  const actor = await requireAuth();
  if (!canReviewSuggestions(actor))
    throw forbidden("Suggestion review access is required.");
  await connectMongo();
  const suggestion = await getVisibleSuggestion(suggestionId, actor);
  const updated = await SuggestionModel.findOneAndUpdate(
    { _id: suggestionId, ...deletedFilter },
    {
      $set: {
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        escalatedAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(suggestion.universityId),
    action: "SUGGESTION_ESCALATED",
    entityType: "suggestion",
    entityId: suggestionId,
  });

  return serializeSuggestion(updated as Record<string, unknown>, actor);
}

export async function resolveSuggestion(suggestionId: string, input: unknown) {
  const actor = await requireAuth();
  if (!canReviewSuggestions(actor))
    throw forbidden("Suggestion review access is required.");
  await connectMongo();
  const payload = resolveSuggestionSchema.parse(input);
  const suggestion = await getVisibleSuggestion(suggestionId, actor);
  const updated = await SuggestionModel.findOneAndUpdate(
    { _id: suggestionId, ...deletedFilter },
    {
      $set: {
        status: "RESOLVED",
        resolution: payload.resolution,
        resolvedAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(suggestion.universityId),
    action: "SUGGESTION_RESOLVED",
    entityType: "suggestion",
    entityId: suggestionId,
  });
  await notifyAuthor(
    updated as Record<string, unknown>,
    actor,
    "Suggestion resolved",
    "Your suggestion has been resolved.",
  );

  return serializeSuggestion(updated as Record<string, unknown>, actor);
}

export async function rejectSuggestion(suggestionId: string, input: unknown) {
  const actor = await requireAuth();
  if (!canReviewSuggestions(actor))
    throw forbidden("Suggestion review access is required.");
  await connectMongo();
  const payload = rejectSuggestionSchema.parse(input);
  const suggestion = await getVisibleSuggestion(suggestionId, actor);
  const updated = await SuggestionModel.findOneAndUpdate(
    { _id: suggestionId, ...deletedFilter },
    {
      $set: {
        status: "REJECTED",
        rejectedReason: payload.reason,
        rejectedAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(suggestion.universityId),
    action: "SUGGESTION_REJECTED",
    entityType: "suggestion",
    entityId: suggestionId,
  });
  await notifyAuthor(
    updated as Record<string, unknown>,
    actor,
    "Suggestion rejected",
    "Your suggestion has been reviewed and rejected.",
  );

  return serializeSuggestion(updated as Record<string, unknown>, actor);
}

export async function getSuggestionAnalytics() {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  if (!canReviewSuggestions(actor))
    throw forbidden("Suggestion review access is required.");
  await connectMongo();
  const [total, resolved, topCategories, openIssues, resolutionStats] =
    await Promise.all([
      SuggestionModel.countDocuments({ universityId, ...deletedFilter }),
      SuggestionModel.countDocuments({
        universityId,
        status: "RESOLVED",
        ...deletedFilter,
      }),
      SuggestionModel.aggregate([
        { $match: { universityId, deletedAt: null } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SuggestionModel.aggregate([
        { $match: { universityId, deletedAt: null } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      SuggestionModel.aggregate([
        {
          $match: {
            universityId,
            status: "RESOLVED",
            resolvedAt: { $ne: null },
            createdAt: { $ne: null },
            deletedAt: null,
          },
        },
        {
          $project: {
            durationMs: { $subtract: ["$resolvedAt", "$createdAt"] },
          },
        },
        { $group: { _id: null, averageMs: { $avg: "$durationMs" } } },
      ]),
    ]);

  return {
    resolutionRate: total ? Math.round((resolved / total) * 10000) / 100 : 0,
    averageResolutionTimeHours: resolutionStats[0]?.averageMs
      ? Math.round((Number(resolutionStats[0].averageMs) / 3600000) * 100) / 100
      : 0,
    topCategories: topCategories.map((row) => ({
      category: String(row._id),
      count: Number(row.count ?? 0),
    })),
    openIssues: openIssues.map((row) => ({
      status: String(row._id),
      count: Number(row.count ?? 0),
    })),
  };
}
