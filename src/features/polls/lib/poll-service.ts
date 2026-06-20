import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import {
  closePollSchema,
  createPollSchema,
  pollQuerySchema,
  updatePollSchema,
  votePollSchema,
  type CreatePollInput,
} from "@/features/polls/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { PollModel, PollVoteModel, UserModel } from "@/lib/db/models";
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

function canCreatePoll(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    isRepresentative(actor)
  );
}

function canManagePoll(actor: AuthUser, poll?: Record<string, unknown>) {
  if (hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles)) {
    return true;
  }

  return Boolean(
    isRepresentative(actor) && poll && poll.creatorId === actor.id,
  );
}

function canVote(actor: AuthUser) {
  return hasRole(actor.role, ["STUDENT", "TEACHER"], actor.roles);
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function normalizeOptions(options: CreatePollInput["options"]) {
  return options.map((option) => {
    if (typeof option === "string") {
      return {
        optionId: randomUUID(),
        label: option,
        voteCount: 0,
      };
    }

    return {
      optionId: option.id ?? randomUUID(),
      label: option.label,
      voteCount: 0,
    };
  });
}

function serializePoll(poll: Record<string, unknown>) {
  const options = Array.isArray(poll.options)
    ? poll.options.map((option) => {
        const record = option as Record<string, unknown>;
        return {
          id: String(record.optionId),
          label: String(record.label),
          voteCount: Number(record.voteCount ?? 0),
        };
      })
    : [];

  return {
    id: String(poll._id),
    universityId: String(poll.universityId),
    creatorId: String(poll.creatorId ?? poll.createdById),
    title: String(poll.title),
    description: typeof poll.description === "string" ? poll.description : null,
    pollType: String(poll.pollType ?? "GENERAL"),
    options,
    visibility: String(poll.visibility ?? "UNIVERSITY"),
    collegeIds: Array.isArray(poll.collegeIds)
      ? poll.collegeIds.map(String)
      : [],
    departmentIds: Array.isArray(poll.departmentIds)
      ? poll.departmentIds.map(String)
      : [],
    customAudience: Array.isArray(poll.customAudience)
      ? poll.customAudience.map(String)
      : [],
    allowMultipleSelection: Boolean(
      poll.allowMultipleSelection ?? poll.allowMultiple,
    ),
    anonymous: Boolean(poll.anonymous),
    startDate: serializeDate(poll.startDate ?? poll.startsAt),
    endDate: serializeDate(poll.endDate ?? poll.endsAt),
    status: String(poll.status),
    analytics: {
      totalVotes: Number(poll.totalVotes ?? 0),
      uniqueVoters: Number(poll.uniqueVoters ?? 0),
      pollReach: Number(poll.pollReach ?? 0),
      participationRate: Number(poll.participationRate ?? 0),
    },
    createdAt: serializeDate(poll.createdAt),
    updatedAt: serializeDate(poll.updatedAt),
  };
}

function actorVisibilityFilter(actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const filters: Record<string, unknown>[] = [
    { universityId, visibility: "UNIVERSITY" },
    { universityId, customAudience: actor.id },
  ];

  if (actor.collegeId) {
    filters.push({
      universityId,
      visibility: "COLLEGE",
      collegeIds: actor.collegeId,
    });
  }
  if (actor.departmentId) {
    filters.push({
      universityId,
      visibility: "DEPARTMENT",
      departmentIds: actor.departmentId,
    });
  }

  return filters;
}

async function calculatePollReach(poll: Record<string, unknown>) {
  const filter: Record<string, unknown> = {
    universityId: poll.universityId,
    status: "ACTIVE",
    deletedAt: null,
    $or: [
      { role: { $in: ["STUDENT", "TEACHER"] } },
      { roles: { $in: ["STUDENT", "TEACHER"] } },
    ],
  };

  if (poll.visibility === "COLLEGE") {
    filter.collegeId = { $in: poll.collegeIds ?? [] };
  }
  if (poll.visibility === "DEPARTMENT") {
    filter.departmentId = { $in: poll.departmentIds ?? [] };
  }
  if (poll.visibility === "CUSTOM") {
    filter._id = { $in: poll.customAudience ?? [] };
  }

  return UserModel.countDocuments(filter);
}

async function refreshPollAnalytics(pollId: string) {
  const poll = await PollModel.findById(pollId).lean();
  if (!poll) return;

  const [uniqueVoters, reach] = await Promise.all([
    PollVoteModel.countDocuments({ pollId }),
    calculatePollReach(poll as Record<string, unknown>),
  ]);
  const totalVotes = Array.isArray(poll.options)
    ? (poll.options as Array<Record<string, unknown>>).reduce(
        (sum: number, option: Record<string, unknown>) =>
          sum + Number(option.voteCount ?? 0),
        0,
      )
    : 0;
  const participationRate = reach
    ? Math.round((uniqueVoters / reach) * 10000) / 100
    : 0;

  await PollModel.updateOne(
    { _id: pollId },
    {
      $set: {
        totalVotes,
        uniqueVoters,
        pollReach: reach,
        participationRate,
      },
    },
  );
}

async function getVisiblePoll(pollId: string, actor: AuthUser) {
  const poll = await PollModel.findOne({
    _id: pollId,
    ...deletedFilter,
    $or: [
      ...actorVisibilityFilter(actor),
      { creatorId: actor.id },
      { createdById: actor.id },
    ],
  }).lean();

  if (!poll) throw notFound("Poll not found.");
  if (
    poll.status === "DRAFT" &&
    !canManagePoll(actor, poll as Record<string, unknown>)
  ) {
    throw notFound("Poll not found.");
  }

  return poll;
}

function assertPollTargetScope(actor: AuthUser, payload: CreatePollInput) {
  if (payload.visibility === "COLLEGE" && !payload.collegeIds.length) {
    if (!actor.collegeId)
      throw forbidden("College visibility requires a college.");
    payload.collegeIds.push(actor.collegeId);
  }
  if (payload.visibility === "DEPARTMENT" && !payload.departmentIds.length) {
    if (!actor.departmentId) {
      throw forbidden("Department visibility requires a department.");
    }
    payload.departmentIds.push(actor.departmentId);
  }
  if (payload.visibility === "CUSTOM" && !payload.customAudience.length) {
    throw forbidden("Custom visibility requires at least one user.");
  }
}

export async function createPoll(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  if (!canCreatePoll(actor))
    throw forbidden("Poll creation access is required.");
  await connectMongo();
  const payload = createPollSchema.parse(input);
  assertPollTargetScope(actor, payload);
  const options = normalizeOptions(payload.options);
  const poll = await PollModel.create({
    _id: randomUUID(),
    universityId,
    createdById: actor.id,
    creatorId: actor.id,
    title: payload.title,
    description: payload.description ?? null,
    pollType: payload.pollType,
    options,
    visibility: payload.visibility,
    collegeIds: payload.collegeIds,
    departmentIds: payload.departmentIds,
    customAudience: payload.customAudience,
    targetAudience: {
      universityWide: payload.visibility === "UNIVERSITY",
      collegeIds: payload.collegeIds,
      departmentIds: payload.departmentIds,
      roles: ["STUDENT", "TEACHER"],
    },
    allowMultiple: payload.allowMultipleSelection,
    allowMultipleSelection: payload.allowMultipleSelection,
    anonymous: payload.anonymous,
    startsAt: payload.startDate ?? null,
    startDate: payload.startDate ?? null,
    endsAt: payload.endDate,
    endDate: payload.endDate,
    status: payload.status,
  });

  await refreshPollAnalytics(String(poll._id));
  await createActivity({
    actorId: actor.id,
    actorType: actor.role,
    universityId,
    collegeId: payload.collegeIds[0] ?? actor.collegeId ?? null,
    departmentId: payload.departmentIds[0] ?? actor.departmentId ?? null,
    activityType: "POLL_CREATED",
    title: payload.title,
    description: payload.description ?? null,
    entityType: "poll",
    entityId: String(poll._id),
    visibility:
      payload.visibility === "CUSTOM"
        ? "PRIVATE"
        : payload.visibility === "UNIVERSITY"
          ? "UNIVERSITY"
          : payload.visibility,
    score: 0,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "POLL_CREATED",
    entityType: "poll",
    entityId: String(poll._id),
    after: serializePoll(poll.toObject()),
  });

  const refreshed = await PollModel.findById(poll._id).lean();
  return serializePoll(
    (refreshed ?? poll.toObject()) as Record<string, unknown>,
  );
}

export async function listPolls(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = pollQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = canCreatePoll(actor)
    ? { universityId: assertUniversityScope(actor), ...deletedFilter }
    : {
        ...deletedFilter,
        $or: actorVisibilityFilter(actor),
        status: { $in: ["ACTIVE", "CLOSED"] },
      };

  if (filters.status && canCreatePoll(actor)) dbFilter.status = filters.status;
  if (filters.pollType) dbFilter.pollType = filters.pollType;
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.mine) dbFilter.creatorId = actor.id;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const polls = await PollModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return polls.map((poll) => serializePoll(poll as Record<string, unknown>));
}

export async function getPoll(pollId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const poll = await getVisiblePoll(pollId, actor);

  return serializePoll(poll as Record<string, unknown>);
}

export async function updatePoll(pollId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const poll = await getVisiblePoll(pollId, actor);
  if (!canManagePoll(actor, poll as Record<string, unknown>)) {
    throw forbidden("You cannot update this poll.");
  }
  const payload = updatePollSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.description !== undefined)
    update.description = payload.description ?? null;
  if (payload.pollType !== undefined) update.pollType = payload.pollType;
  if (payload.options !== undefined)
    update.options = normalizeOptions(payload.options);
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.collegeIds !== undefined) update.collegeIds = payload.collegeIds;
  if (payload.departmentIds !== undefined)
    update.departmentIds = payload.departmentIds;
  if (payload.customAudience !== undefined)
    update.customAudience = payload.customAudience;
  if (payload.allowMultipleSelection !== undefined) {
    update.allowMultipleSelection = payload.allowMultipleSelection;
    update.allowMultiple = payload.allowMultipleSelection;
  }
  if (payload.anonymous !== undefined) update.anonymous = payload.anonymous;
  if (payload.startDate !== undefined) {
    update.startDate = payload.startDate ?? null;
    update.startsAt = payload.startDate ?? null;
  }
  if (payload.endDate !== undefined) {
    update.endDate = payload.endDate;
    update.endsAt = payload.endDate;
  }
  if (payload.status !== undefined) update.status = payload.status;

  const updated = await PollModel.findOneAndUpdate(
    { _id: pollId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await refreshPollAnalytics(pollId);
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(poll.universityId),
    action: "POLL_UPDATED",
    entityType: "poll",
    entityId: pollId,
    before: serializePoll(poll as Record<string, unknown>),
    after: updated ? serializePoll(updated as Record<string, unknown>) : null,
  });

  const refreshed = await PollModel.findById(pollId).lean();
  return serializePoll((refreshed ?? updated) as Record<string, unknown>);
}

export async function closePoll(pollId: string, input: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = closePollSchema.parse(input);
  const poll = await getVisiblePoll(pollId, actor);
  if (!canManagePoll(actor, poll as Record<string, unknown>)) {
    throw forbidden("You cannot close this poll.");
  }

  const updated = await PollModel.findOneAndUpdate(
    { _id: pollId, ...deletedFilter },
    { $set: { status: "CLOSED", closedAt: new Date(), updatedById: actor.id } },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(poll.universityId),
    action: "POLL_CLOSED",
    entityType: "poll",
    entityId: pollId,
    metadata: { reason: payload.reason ?? null },
  });

  return serializePoll(updated as Record<string, unknown>);
}

export async function reopenPoll(pollId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const poll = await getVisiblePoll(pollId, actor);
  if (!canManagePoll(actor, poll as Record<string, unknown>)) {
    throw forbidden("You cannot reopen this poll.");
  }

  const updated = await PollModel.findOneAndUpdate(
    { _id: pollId, ...deletedFilter },
    {
      $set: { status: "ACTIVE", reopenedAt: new Date(), updatedById: actor.id },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(poll.universityId),
    action: "POLL_REOPENED",
    entityType: "poll",
    entityId: pollId,
  });

  return serializePoll(updated as Record<string, unknown>);
}

export async function votePoll(pollId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  if (!canVote(actor)) throw forbidden("Only students and teachers can vote.");
  const payload = votePollSchema.parse(input);
  const poll = await getVisiblePoll(pollId, actor);
  const now = new Date();

  if (poll.status !== "ACTIVE") throw forbidden("This poll is not active.");
  if (poll.startDate && new Date(poll.startDate).getTime() > now.getTime()) {
    throw forbidden("This poll has not started.");
  }
  if (poll.endDate && new Date(poll.endDate).getTime() < now.getTime()) {
    throw forbidden("This poll has ended.");
  }
  if (!poll.allowMultipleSelection && payload.selectedOptions.length > 1) {
    throw forbidden("This poll allows only one selection.");
  }

  const optionIds = new Set(
    Array.isArray(poll.options)
      ? (poll.options as Array<Record<string, unknown>>).map((option) =>
          String(option.optionId),
        )
      : [],
  );
  const selectedOptions = Array.from(new Set(payload.selectedOptions));
  if (selectedOptions.some((optionId) => !optionIds.has(optionId))) {
    throw forbidden("Invalid poll option selected.");
  }

  const existing = await PollVoteModel.findOne({
    pollId,
    userId: actor.id,
  }).lean();
  const previousOptions = existing
    ? (existing.selectedOptions ?? existing.optionIds ?? []).map(String)
    : [];

  if (existing) {
    await PollVoteModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          optionIds: selectedOptions,
          selectedOptions,
          votedAt: now,
        },
      },
    );
  } else {
    await PollVoteModel.create({
      _id: randomUUID(),
      universityId: poll.universityId,
      pollId,
      userId: actor.id,
      optionIds: selectedOptions,
      selectedOptions,
      votedAt: now,
      metadata: {
        collegeId: actor.collegeId,
        departmentId: actor.departmentId,
      },
    });
  }

  for (const optionId of previousOptions) {
    await PollModel.updateOne(
      { _id: pollId, "options.optionId": optionId },
      { $inc: { "options.$.voteCount": -1 } },
    );
  }
  for (const optionId of selectedOptions) {
    await PollModel.updateOne(
      { _id: pollId, "options.optionId": optionId },
      { $inc: { "options.$.voteCount": 1 } },
    );
  }
  await refreshPollAnalytics(pollId);
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(poll.universityId),
    action: "POLL_VOTED",
    entityType: "poll",
    entityId: pollId,
    metadata: { changedVote: Boolean(existing) },
  });

  return { voted: true, selectedOptions };
}

async function pollResults(pollId: string, actor: AuthUser) {
  const poll = await getVisiblePoll(pollId, actor);
  const [votesByCollege, votesByDepartment, voteCount] = await Promise.all([
    PollVoteModel.aggregate([
      { $match: { pollId } },
      { $group: { _id: "$metadata.collegeId", votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
    ]),
    PollVoteModel.aggregate([
      { $match: { pollId } },
      { $group: { _id: "$metadata.departmentId", votes: { $sum: 1 } } },
      { $sort: { votes: -1 } },
    ]),
    PollVoteModel.countDocuments({ pollId }),
  ]);

  await refreshPollAnalytics(pollId);
  const refreshed = await PollModel.findById(pollId).lean();
  const serialized = serializePoll(
    (refreshed ?? poll) as Record<string, unknown>,
  );

  return {
    poll: serialized,
    results: serialized.options,
    analytics: {
      participationRate: serialized.analytics.participationRate,
      votesByCollege: votesByCollege.map((row) => ({
        collegeId: row._id ? String(row._id) : null,
        votes: Number(row.votes ?? 0),
      })),
      votesByDepartment: votesByDepartment.map((row) => ({
        departmentId: row._id ? String(row._id) : null,
        votes: Number(row.votes ?? 0),
      })),
      pollReach: serialized.analytics.pollReach,
      uniqueVoters: voteCount,
    },
  };
}

export async function getPollResults(pollId: string) {
  const actor = await requireAuth();
  await connectMongo();

  return pollResults(pollId, actor);
}

export async function exportPollResults(pollId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const poll = await getVisiblePoll(pollId, actor);
  if (!canManagePoll(actor, poll as Record<string, unknown>)) {
    throw forbidden("You cannot export this poll.");
  }
  const result = await pollResults(pollId, actor);
  const rows = result.results.map((option) => ({
    pollId,
    optionId: option.id,
    option: option.label,
    votes: option.voteCount,
  }));

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(poll.universityId),
    action: "POLL_RESULTS_EXPORTED",
    entityType: "poll",
    entityId: pollId,
    metadata: { rows: rows.length },
  });

  return {
    filename: `poll-${pollId}-results.csv`,
    rows,
    analytics: result.analytics,
  };
}
