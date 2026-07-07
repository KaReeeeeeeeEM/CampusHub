import { randomUUID } from "node:crypto";

import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  completeAchievementSchema,
  createAchievementSchema,
  listAchievementsQuerySchema,
  updateAchievementProgressSchema,
  userAchievementQuerySchema,
  type CreateAchievementInput,
} from "@/features/gamification/lib/achievement-schemas";
import { grantBadgeToUser } from "@/features/gamification/lib/badge-service";
import { createRewardEventForUser } from "@/features/gamification/lib/reward-event-service";
import { awardXpToUser } from "@/features/gamification/lib/xp-service";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AchievementModel,
  UserAchievementModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

const DEFAULT_ACHIEVEMENTS: Array<
  Omit<CreateAchievementInput, "status"> & {
    status?: CreateAchievementInput["status"];
  }
> = [
  {
    name: "Campus Innovator",
    slug: "campus-innovator",
    description: "Complete and publish multiple student projects.",
    requirements: { type: "PROJECTS_PUBLISHED", count: 3 },
    xpReward: 250,
    badgeReward: { slug: "first-project" },
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
  {
    name: "Marketplace Entrepreneur",
    slug: "marketplace-entrepreneur",
    description: "Build momentum through marketplace products and sales.",
    requirements: {
      type: "MARKETPLACE_COMPOSITE",
      productsCreated: 5,
      completedOrders: 3,
    },
    xpReward: 300,
    badgeReward: { slug: "first-marketplace-sale" },
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
  {
    name: "Community Leader",
    slug: "community-leader",
    description: "Create and grow community participation.",
    requirements: { type: "COMMUNITY_CREATED", count: 1 },
    xpReward: 220,
    badgeReward: { slug: "community-builder" },
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
  {
    name: "Top Mentor",
    slug: "top-mentor-achievement",
    description: "Complete mentorship milestones.",
    requirements: { type: "MENTORSHIPS_COMPLETED", count: 5 },
    xpReward: 400,
    badgeReward: { slug: "top-mentor" },
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
  {
    name: "Career Builder",
    slug: "career-builder",
    description: "Complete career profile and apply to opportunities.",
    requirements: {
      type: "CAREER_COMPOSITE",
      profileCompleted: true,
      applicationsSubmitted: 5,
    },
    xpReward: 250,
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
  {
    name: "Event Champion",
    slug: "event-champion",
    description: "Join and attend campus events consistently.",
    requirements: { type: "EVENTS_ATTENDED", count: 10 },
    xpReward: 250,
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
  {
    name: "University Influencer",
    slug: "university-influencer",
    description: "Contribute across forums, polls, suggestions, and projects.",
    requirements: {
      type: "ENGAGEMENT_COMPOSITE",
      forumPosts: 10,
      pollVotes: 10,
      suggestions: 3,
      projectStarsReceived: 10,
    },
    xpReward: 500,
    badgeReward: { slug: "leadership-voice" },
    visibility: "UNIVERSITY",
    isGlobal: true,
  },
];

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageAchievements(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.BADGE_MANAGE)
  );
}

function assertCanManageAchievements(actor: AuthUser) {
  if (!canManageAchievements(actor)) {
    throw forbidden("Achievement management access is required.");
  }
}

function scopedAchievementUniversity(actor: AuthUser, requested?: string | null) {
  if (isSuperAdmin(actor)) return requested ?? null;
  if (!actor.universityId) throw forbidden("University scope is required.");

  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot manage achievements outside your university.");
  }

  return actor.universityId;
}

function serializeAchievement(achievement: Record<string, unknown>) {
  return {
    id: String(achievement._id),
    universityId:
      typeof achievement.universityId === "string"
        ? achievement.universityId
        : null,
    name: String(achievement.name),
    slug: String(achievement.slug),
    description:
      typeof achievement.description === "string"
        ? achievement.description
        : null,
    requirements: achievement.requirements ?? null,
    xpReward: Number(achievement.xpReward ?? 0),
    badgeReward: achievement.badgeReward ?? null,
    visibility: String(achievement.visibility ?? "UNIVERSITY"),
    isGlobal: Boolean(achievement.isGlobal),
    status: String(achievement.status ?? "ACTIVE"),
    metadata: achievement.metadata ?? null,
    createdAt: serializeDate(achievement.createdAt),
    updatedAt: serializeDate(achievement.updatedAt),
  };
}

function serializeUserAchievement(
  userAchievement: Record<string, unknown>,
  achievement?: Record<string, unknown>,
) {
  return {
    id: String(userAchievement._id),
    universityId: String(userAchievement.universityId),
    userId: String(userAchievement.userId),
    achievementId: String(userAchievement.achievementId),
    achievement: achievement ? serializeAchievement(achievement) : null,
    progress: userAchievement.progress ?? null,
    progressValue: Number(userAchievement.progressValue ?? 0),
    targetValue: Number(userAchievement.targetValue ?? 1),
    status: String(userAchievement.status ?? "IN_PROGRESS"),
    startedAt: serializeDate(userAchievement.startedAt),
    completedAt: serializeDate(userAchievement.completedAt),
    rewardsGrantedAt: serializeDate(userAchievement.rewardsGrantedAt),
    metadata: userAchievement.metadata ?? null,
    createdAt: serializeDate(userAchievement.createdAt),
    updatedAt: serializeDate(userAchievement.updatedAt),
  };
}

async function getActiveUserOrThrow(userId: string) {
  const user = await UserModel.findOne({
    _id: userId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!user) throw notFound("User not found.");
  if (typeof user.universityId !== "string") {
    throw forbidden("Target user must belong to a university.");
  }

  return user as Record<string, unknown> & {
    _id: string;
    universityId: string;
    collegeId?: string | null;
    departmentId?: string | null;
  };
}

async function resolveAchievementForUser(input: {
  achievementId?: string;
  slug?: string;
  universityId: string;
}) {
  const achievement = await AchievementModel.findOne({
    ...(input.achievementId
      ? { _id: input.achievementId }
      : { slug: input.slug }),
    status: "ACTIVE",
    ...deletedFilter,
    $or: [
      { isGlobal: true },
      { universityId: null },
      { universityId: input.universityId },
    ],
  }).lean();

  if (!achievement) throw notFound("Achievement not found.");

  return achievement as Record<string, unknown>;
}

async function achievementsById(achievementIds: string[]) {
  const achievements = await AchievementModel.find({
    _id: { $in: Array.from(new Set(achievementIds)) },
  }).lean();

  return new Map(
    achievements.map((achievement) => [
      String(achievement._id),
      achievement as Record<string, unknown>,
    ]),
  );
}

function targetFromRequirements(requirements: unknown) {
  if (
    requirements &&
    typeof requirements === "object" &&
    "count" in requirements &&
    typeof (requirements as { count?: unknown }).count === "number"
  ) {
    return (requirements as { count: number }).count;
  }

  return 1;
}

async function grantAchievementRewards(input: {
  actor: AuthUser;
  user: Awaited<ReturnType<typeof getActiveUserOrThrow>>;
  achievement: Record<string, unknown>;
  userAchievementId: string;
}) {
  const xpReward = Number(input.achievement.xpReward ?? 0);
  const badgeReward = input.achievement.badgeReward as
    | { badgeId?: string; slug?: string }
    | null
    | undefined;

  if (xpReward > 0) {
    await awardXpToUser(input.actor, {
      userId: String(input.user._id),
      action: "COMPLETE_ACHIEVEMENT",
      xpAwarded: xpReward,
      sourceType: "ACHIEVEMENT",
      sourceId: input.userAchievementId,
      idempotencyKey: `achievement-xp:${input.userAchievementId}`,
      metadata: {
        achievementId: String(input.achievement._id),
        achievementSlug: String(input.achievement.slug),
      },
    });
  }

  if (badgeReward) {
    await grantBadgeToUser(input.actor, {
      userId: String(input.user._id),
      badgeId: badgeReward.badgeId,
      slug: badgeReward.slug,
      source: "ACHIEVEMENT",
      metadata: {
        achievementId: String(input.achievement._id),
        userAchievementId: input.userAchievementId,
      },
    });
  }

  await createSystemNotification({
    target: {
      recipientId: String(input.user._id),
      universityId: input.user.universityId,
    },
    senderId: input.actor.id,
    type: "SYSTEM",
    title: "Achievement completed",
    message: `You completed ${String(input.achievement.name)}.`,
    entityType: "user_achievement",
    entityId: input.userAchievementId,
    priority: "NORMAL",
    metadata: {
      achievementId: String(input.achievement._id),
      achievementSlug: String(input.achievement.slug),
      xpReward,
      badgeReward: badgeReward ?? null,
    },
  });

  await createActivity({
    actorId: String(input.user._id),
    actorType: "USER",
    universityId: input.user.universityId,
    collegeId: typeof input.user.collegeId === "string" ? input.user.collegeId : null,
    departmentId:
      typeof input.user.departmentId === "string"
        ? input.user.departmentId
        : null,
    activityType: "ACHIEVEMENT_COMPLETED",
    title: `${String(input.achievement.name)} completed`,
    description:
      typeof input.achievement.description === "string"
        ? input.achievement.description
        : null,
    entityType: "user_achievement",
    entityId: input.userAchievementId,
    visibility: "PRIVATE",
    score: xpReward,
    metadata: {
      achievementId: String(input.achievement._id),
      achievementSlug: String(input.achievement.slug),
    },
  });

  await createRewardEventForUser(input.actor, {
    userId: String(input.user._id),
    trigger: "ACHIEVEMENT_UNLOCKED",
    title: "Achievement unlocked",
    description: `You completed ${String(input.achievement.name)}.`,
    reward: {
      type: "ACHIEVEMENT",
      label: String(input.achievement.name),
      xpReward,
      badgeReward: badgeReward ?? null,
    },
    xp: xpReward,
    badge: badgeReward ?? null,
    animationType: xpReward >= 400 ? "FIREWORKS" : "TROPHY",
    entityType: "user_achievement",
    entityId: input.userAchievementId,
    metadata: {
      achievementId: String(input.achievement._id),
      achievementSlug: String(input.achievement.slug),
    },
  });
}

export async function createAchievement(input: unknown) {
  const actor = await requireAuth();
  assertCanManageAchievements(actor);
  await connectPostgres();
  const payload = createAchievementSchema.parse(input);
  const universityId = scopedAchievementUniversity(actor, payload.universityId);
  const slug = payload.slug ?? slugify(payload.name);

  if (!slug) throw forbidden("Achievement slug is required.");

  const existing = await AchievementModel.exists({
    universityId,
    slug,
    ...deletedFilter,
  });
  if (existing) throw forbidden("Achievement slug already exists.");

  const achievement = await AchievementModel.create({
    _id: randomUUID(),
    universityId,
    name: payload.name,
    slug,
    description: payload.description ?? null,
    requirements: payload.requirements,
    xpReward: payload.xpReward,
    badgeReward: payload.badgeReward ?? null,
    visibility: payload.visibility,
    isGlobal: isSuperAdmin(actor) ? payload.isGlobal : false,
    status: payload.status,
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ACHIEVEMENT_CREATED",
    entityType: "achievement",
    entityId: String(achievement._id),
    after: serializeAchievement(achievement.toObject()),
  });

  return serializeAchievement(achievement.toObject());
}

export async function seedDefaultAchievements(input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageAchievements(actor);
  await connectPostgres();
  const payload = createAchievementSchema
    .pick({ universityId: true })
    .partial()
    .parse(input);
  const universityId = scopedAchievementUniversity(actor, payload.universityId);
  const created: Array<Record<string, unknown>> = [];
  const existing: Array<Record<string, unknown>> = [];

  for (const definition of DEFAULT_ACHIEVEMENTS) {
    const current = await AchievementModel.findOne({
      universityId,
      slug: definition.slug,
      ...deletedFilter,
    }).lean();

    if (current) {
      existing.push(current as Record<string, unknown>);
      continue;
    }

    const achievement = await AchievementModel.create({
      _id: randomUUID(),
      universityId,
      ...definition,
      isGlobal: isSuperAdmin(actor) && !universityId,
      status: "ACTIVE",
      createdById: actor.id,
    });
    created.push(achievement.toObject());
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ACHIEVEMENT_DEFAULTS_SEEDED",
    entityType: "achievement",
    entityId: null,
    metadata: {
      created: created.length,
      existing: existing.length,
    },
  });

  return {
    created: created.map(serializeAchievement),
    existing: existing.map(serializeAchievement),
  };
}

export async function listAchievements(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = listAchievementsQuerySchema.parse(query);
  const universityId = scopedAchievementUniversity(actor, filters.universityId);
  const scopeFilters: Record<string, unknown>[] = [];

  if (filters.includeGlobal) {
    scopeFilters.push({ isGlobal: true }, { universityId: null });
  }
  if (universityId) scopeFilters.push({ universityId });

  const dbFilter: Record<string, unknown> = {
    status: filters.status,
    ...deletedFilter,
  };

  if (scopeFilters.length) dbFilter.$or = scopeFilters;
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.q) dbFilter.name = { $regex: filters.q, $options: "i" };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const achievements = await AchievementModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return achievements.map((achievement) =>
    serializeAchievement(achievement as Record<string, unknown>),
  );
}

export async function updateAchievementProgress(input: unknown) {
  const actor = await requireAuth();
  assertCanManageAchievements(actor);
  await connectPostgres();
  const payload = updateAchievementProgressSchema.parse(input);
  const user = await getActiveUserOrThrow(payload.userId);

  if (!isSuperAdmin(actor) && actor.universityId !== user.universityId) {
    throw forbidden("Cannot update achievements outside your university.");
  }

  const achievement = await resolveAchievementForUser({
    achievementId: payload.achievementId,
    slug: payload.slug,
    universityId: user.universityId,
  });
  const targetValue =
    payload.targetValue ?? targetFromRequirements(achievement.requirements);
  const existing = await UserAchievementModel.findOne({
    userId: payload.userId,
    achievementId: String(achievement._id),
  }).lean();
  const nextProgressValue =
    payload.progressValue ??
    Number(existing?.progressValue ?? 0) + Number(payload.incrementBy ?? 0);
  const shouldComplete =
    payload.complete || nextProgressValue >= Number(targetValue);
  const completedAt =
    shouldComplete && !existing?.completedAt ? new Date() : existing?.completedAt;

  const userAchievement = await UserAchievementModel.findOneAndUpdate(
    {
      userId: payload.userId,
      achievementId: String(achievement._id),
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: user.universityId,
        userId: payload.userId,
        achievementId: String(achievement._id),
        startedAt: new Date(),
      },
      $set: {
        progress: payload.progress ?? existing?.progress ?? null,
        progressValue: nextProgressValue,
        targetValue,
        status: shouldComplete ? "COMPLETED" : "IN_PROGRESS",
        completedAt: completedAt ?? null,
        metadata: payload.metadata ?? existing?.metadata ?? null,
      },
    },
    { new: true, upsert: true },
  ).lean();

  if (
    shouldComplete &&
    userAchievement &&
    !userAchievement.rewardsGrantedAt
  ) {
    await grantAchievementRewards({
      actor,
      user,
      achievement,
      userAchievementId: String(userAchievement._id),
    });
    await UserAchievementModel.updateOne(
      { _id: userAchievement._id },
      { $set: { rewardsGrantedAt: new Date() } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: user.universityId,
    action: shouldComplete
      ? "ACHIEVEMENT_COMPLETED"
      : "ACHIEVEMENT_PROGRESS_UPDATED",
    entityType: "user_achievement",
    entityId: String(userAchievement?._id),
    after: {
      userId: payload.userId,
      achievementId: String(achievement._id),
      progressValue: nextProgressValue,
      targetValue,
      status: shouldComplete ? "COMPLETED" : "IN_PROGRESS",
    },
  });

  const refreshed = await UserAchievementModel.findById(
    userAchievement?._id,
  ).lean();

  return serializeUserAchievement(
    refreshed as Record<string, unknown>,
    achievement,
  );
}

export async function completeAchievement(input: unknown) {
  const payload = completeAchievementSchema.parse(input);

  return updateAchievementProgress({
    ...payload,
    complete: true,
  });
}

export async function getUserAchievements(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = userAchievementQuerySchema.parse(query);
  const targetUserId = filters.userId ?? actor.id;
  const user = await getActiveUserOrThrow(targetUserId);

  if (
    actor.id !== targetUserId &&
    !isSuperAdmin(actor) &&
    !(
      hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles) &&
      actor.universityId === user.universityId
    )
  ) {
    throw forbidden("Cannot access another user's achievements.");
  }

  const dbFilter: Record<string, unknown> = {
    userId: targetUserId,
    universityId: user.universityId,
  };
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.updatedAt = { $lt: new Date(filters.cursor) };

  const userAchievements = await UserAchievementModel.find(dbFilter)
    .sort({ completedAt: -1, updatedAt: -1 })
    .limit(filters.limit)
    .lean();
  const achievementMap = await achievementsById(
    userAchievements.map((item) => String(item.achievementId)),
  );

  return userAchievements.map((item) =>
    serializeUserAchievement(
      item as Record<string, unknown>,
      achievementMap.get(String(item.achievementId)),
    ),
  );
}

export async function getAchievementHistory(query: unknown = {}) {
  return getUserAchievements({
    ...((query as Record<string, unknown>) ?? {}),
    status: "COMPLETED",
  });
}
