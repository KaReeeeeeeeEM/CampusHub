import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  activityFeedQuerySchema,
  createActivitySchema,
  scopedFeedQuerySchema,
  type ActivityFeedQueryInput,
  type CreateActivityInput,
} from "@/features/activity-feed/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { ActivityFeedModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function requireActorUniversity(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function assertUniversityAccess(actor: AuthUser, universityId?: string | null) {
  if (isSuperAdmin(actor)) return universityId ?? actor.universityId ?? null;
  const actorUniversityId = requireActorUniversity(actor);

  if (universityId && universityId !== actorUniversityId) {
    throw forbidden("Cannot access another university feed.");
  }

  return actorUniversityId;
}

function serializeActivity(activity: Record<string, unknown>) {
  return {
    id: String(activity._id),
    actorId: typeof activity.actorId === "string" ? activity.actorId : null,
    actorType:
      typeof activity.actorType === "string" ? activity.actorType : null,
    universityId: String(activity.universityId),
    collegeId:
      typeof activity.collegeId === "string" ? activity.collegeId : null,
    departmentId:
      typeof activity.departmentId === "string" ? activity.departmentId : null,
    activityType: String(activity.activityType ?? activity.verb),
    title: String(activity.title),
    description:
      typeof activity.description === "string" ? activity.description : null,
    entityType: String(activity.entityType),
    entityId: String(activity.entityId),
    image: typeof activity.image === "string" ? activity.image : null,
    visibility: String(activity.visibility ?? "UNIVERSITY"),
    score: Number(activity.score ?? 0),
    metadata: activity.metadata ?? null,
    createdAt: serializeDate(activity.createdAt),
  };
}

function categoryForActivity(activityType: string) {
  if (
    activityType.startsWith("ANNOUNCEMENT") ||
    activityType.startsWith("POLL")
  ) {
    return "ACADEMIC";
  }
  if (activityType.startsWith("EVENT") || activityType === "FORUM_POST") {
    return "SOCIAL";
  }
  if (activityType.startsWith("PROJECT")) return "SHOWCASE";
  if (activityType.includes("PRODUCT") || activityType.includes("ORDER")) {
    return "MARKETPLACE";
  }
  if (
    activityType.includes("OPPORTUNITY") ||
    activityType.includes("MENTORSHIP")
  ) {
    return "CAREER";
  }
  if (
    activityType.includes("BADGE") ||
    activityType.includes("XP") ||
    activityType.includes("ACHIEVEMENT")
  ) {
    return "ACHIEVEMENT";
  }

  return "SYSTEM";
}

function visibilityFilter(actor: AuthUser, baseUniversityId?: string | null) {
  const publicFilter = { visibility: "PUBLIC" };
  const filters: Record<string, unknown>[] = [publicFilter];
  const universityId = assertUniversityAccess(actor, baseUniversityId);

  if (universityId) {
    filters.push({ universityId, visibility: "UNIVERSITY" });
  }
  if (universityId && actor.collegeId) {
    filters.push({
      universityId,
      collegeId: actor.collegeId,
      visibility: "COLLEGE",
    });
  }
  if (universityId && actor.departmentId) {
    filters.push({
      universityId,
      departmentId: actor.departmentId,
      visibility: "DEPARTMENT",
    });
  }
  filters.push({ actorId: actor.id, visibility: "PRIVATE" });

  return filters;
}

function applyCommonFilters(
  dbFilter: Record<string, unknown>,
  filters: ActivityFeedQueryInput,
) {
  if (filters.activityType) dbFilter.activityType = filters.activityType;
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.entityType) dbFilter.entityType = filters.entityType;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };
}

async function auditFeedFailure(
  actor: AuthUser | null,
  scope: string,
  error: unknown,
) {
  await writeAuditLog({
    actorId: actor?.id ?? null,
    universityId: actor?.universityId ?? null,
    action: "ACTIVITY_FEED_GENERATION_FAILED",
    entityType: "activity_feed",
    entityId: null,
    metadata: {
      scope,
      message: error instanceof Error ? error.message : "Unknown error",
    },
  });
}

async function executeFeedQuery(
  actor: AuthUser,
  scope: string,
  dbFilter: Record<string, unknown>,
  filters: ActivityFeedQueryInput,
  sort: Record<string, 1 | -1> = { createdAt: -1 },
) {
  try {
    applyCommonFilters(dbFilter, filters);
    const activities = await ActivityFeedModel.find(dbFilter)
      .sort(sort)
      .limit(filters.limit)
      .lean();

    return activities.map((activity) =>
      serializeActivity(activity as Record<string, unknown>),
    );
  } catch (error) {
    await auditFeedFailure(actor, scope, error);
    throw error;
  }
}

export async function createActivity(input: CreateActivityInput) {
  await connectPostgres();
  const payload = createActivitySchema.parse(input);
  const activity = await ActivityFeedModel.create({
    _id: randomUUID(),
    actorId: payload.actorId ?? null,
    actorType: payload.actorType ?? null,
    universityId: payload.universityId,
    collegeId: payload.collegeId ?? null,
    departmentId: payload.departmentId ?? null,
    verb: payload.activityType,
    activityType: payload.activityType,
    title: payload.title,
    description: payload.description ?? null,
    entityType: payload.entityType,
    entityId: payload.entityId,
    image: payload.image ?? null,
    visibility: payload.visibility,
    category: categoryForActivity(payload.activityType),
    audience: {
      visibility: payload.visibility,
      universityId: payload.universityId,
      collegeId: payload.collegeId ?? null,
      departmentId: payload.departmentId ?? null,
    },
    score: payload.score,
    expiresAt: payload.expiresAt ?? null,
    metadata: payload.metadata ?? null,
  });

  return serializeActivity(activity.toObject());
}

export async function getPersonalFeed(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = activityFeedQuerySchema.parse(query);
  const dbFilter = {
    $or: visibilityFilter(actor, actor.universityId),
  };

  return executeFeedQuery(actor, "PERSONAL", dbFilter, filters);
}

export async function getUniversityFeed(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = scopedFeedQuerySchema.parse(query);
  const feedFilters = { ...filters, visibility: undefined };
  const universityId = assertUniversityAccess(actor, filters.universityId);

  if (!universityId) throw forbidden("University scope is required.");

  return executeFeedQuery(
    actor,
    "UNIVERSITY",
    {
      universityId,
      visibility: { $in: ["PUBLIC", "UNIVERSITY"] },
    },
    feedFilters,
  );
}

export async function getCollegeFeed(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = scopedFeedQuerySchema.parse(query);
  const feedFilters = { ...filters, visibility: undefined };
  const universityId = assertUniversityAccess(actor, filters.universityId);
  const collegeId = filters.collegeId ?? actor.collegeId;

  if (!universityId || !collegeId) {
    throw forbidden("College scope is required.");
  }
  if (!isSuperAdmin(actor) && actor.collegeId !== collegeId) {
    throw forbidden("Cannot access another college feed.");
  }

  return executeFeedQuery(
    actor,
    "COLLEGE",
    {
      universityId,
      $or: [
        { visibility: { $in: ["PUBLIC", "UNIVERSITY"] } },
        { visibility: "COLLEGE", collegeId },
      ],
    },
    feedFilters,
  );
}

export async function getDepartmentFeed(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = scopedFeedQuerySchema.parse(query);
  const feedFilters = { ...filters, visibility: undefined };
  const universityId = assertUniversityAccess(actor, filters.universityId);
  const departmentId = filters.departmentId ?? actor.departmentId;

  if (!universityId || !departmentId) {
    throw forbidden("Department scope is required.");
  }
  if (!isSuperAdmin(actor) && actor.departmentId !== departmentId) {
    throw forbidden("Cannot access another department feed.");
  }

  return executeFeedQuery(
    actor,
    "DEPARTMENT",
    {
      universityId,
      $or: [
        { visibility: { $in: ["PUBLIC", "UNIVERSITY"] } },
        { visibility: "COLLEGE", collegeId: actor.collegeId },
        { visibility: "DEPARTMENT", departmentId },
      ],
    },
    feedFilters,
  );
}

export async function getTrendingFeed(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = scopedFeedQuerySchema.parse(query);
  const universityId = assertUniversityAccess(actor, filters.universityId);
  const dbFilter: Record<string, unknown> = {
    $or: visibilityFilter(actor, universityId),
  };

  return executeFeedQuery(actor, "TRENDING", dbFilter, filters, {
    score: -1,
    createdAt: -1,
  });
}
