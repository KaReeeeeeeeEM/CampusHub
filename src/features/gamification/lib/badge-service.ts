import { randomUUID } from "node:crypto";

import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  createBadgeSchema,
  earnBadgeSchema,
  listBadgesQuerySchema,
  updateUserBadgeDisplaySchema,
  userBadgeQuerySchema,
  type CreateBadgeInput,
} from "@/features/gamification/lib/badge-schemas";
import { createRewardEventForUser } from "@/features/gamification/lib/reward-event-service";
import { awardXpToUser } from "@/features/gamification/lib/xp-service";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { BadgeModel, UserBadgeModel, UserModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

const DEFAULT_BADGES: Array<
  Omit<CreateBadgeInput, "status"> & { status?: CreateBadgeInput["status"] }
> = [
  {
    name: "First Login",
    slug: "first-login",
    description: "Awarded when a user logs in for the first time.",
    icon: "log-in",
    category: "Engagement",
    rarity: "COMMON",
    xpReward: 10,
    criteria: { type: "XP_ACTION", action: "DAILY_LOGIN", count: 1 },
    isGlobal: true,
  },
  {
    name: "3 Day Streak",
    slug: "streak-3-days",
    description: "Awarded for maintaining a three day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "COMMON",
    xpReward: 15,
    criteria: { type: "STREAK_MILESTONE", days: 3 },
    isGlobal: true,
  },
  {
    name: "7 Day Streak",
    slug: "streak-7-days",
    description: "Awarded for maintaining a seven day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "UNCOMMON",
    xpReward: 35,
    criteria: { type: "STREAK_MILESTONE", days: 7 },
    isGlobal: true,
  },
  {
    name: "14 Day Streak",
    slug: "streak-14-days",
    description: "Awarded for maintaining a fourteen day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "UNCOMMON",
    xpReward: 70,
    criteria: { type: "STREAK_MILESTONE", days: 14 },
    isGlobal: true,
  },
  {
    name: "30 Day Streak",
    slug: "streak-30-days",
    description: "Awarded for maintaining a thirty day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "RARE",
    xpReward: 150,
    criteria: { type: "STREAK_MILESTONE", days: 30 },
    isGlobal: true,
  },
  {
    name: "60 Day Streak",
    slug: "streak-60-days",
    description: "Awarded for maintaining a sixty day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "EPIC",
    xpReward: 250,
    criteria: { type: "STREAK_MILESTONE", days: 60 },
    isGlobal: true,
  },
  {
    name: "100 Day Streak",
    slug: "streak-100-days",
    description: "Awarded for maintaining a one hundred day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "EPIC",
    xpReward: 500,
    criteria: { type: "STREAK_MILESTONE", days: 100 },
    isGlobal: true,
  },
  {
    name: "365 Day Streak",
    slug: "streak-365-days",
    description: "Awarded for maintaining a full year activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "LEGENDARY",
    xpReward: 2000,
    criteria: { type: "STREAK_MILESTONE", days: 365 },
    isGlobal: true,
  },
  {
    name: "5 Day Streak",
    slug: "5-day-streak",
    description: "Awarded for maintaining a five day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "UNCOMMON",
    xpReward: 25,
    criteria: { type: "STREAK", streakType: "DAILY_LOGIN", days: 5 },
    isGlobal: true,
  },
  {
    name: "10 Day Streak",
    slug: "10-day-streak",
    description: "Awarded for maintaining a ten day activity streak.",
    icon: "flame",
    category: "Streaks",
    rarity: "RARE",
    xpReward: 50,
    criteria: { type: "STREAK", streakType: "DAILY_LOGIN", days: 10 },
    isGlobal: true,
  },
  {
    name: "First Project",
    slug: "first-project",
    description: "Awarded after creating a first showcase project.",
    icon: "rocket",
    category: "Projects",
    rarity: "COMMON",
    xpReward: 25,
    criteria: { type: "XP_ACTION", action: "CREATE_PROJECT", count: 1 },
    isGlobal: true,
  },
  {
    name: "100 Project Views",
    slug: "100-project-views",
    description: "Awarded when a project reaches 100 views.",
    icon: "eye",
    category: "Projects",
    rarity: "RARE",
    xpReward: 75,
    criteria: { type: "PROJECT_METRIC", metric: "views", threshold: 100 },
    isGlobal: true,
  },
  {
    name: "10 Project Stars",
    slug: "10-project-stars",
    description: "Awarded when a project receives 10 stars.",
    icon: "star",
    category: "Projects",
    rarity: "RARE",
    xpReward: 75,
    criteria: { type: "PROJECT_METRIC", metric: "stars", threshold: 10 },
    isGlobal: true,
  },
  {
    name: "First Marketplace Sale",
    slug: "first-marketplace-sale",
    description: "Awarded after completing a first marketplace sale.",
    icon: "shopping-bag",
    category: "Marketplace",
    rarity: "UNCOMMON",
    xpReward: 50,
    criteria: {
      type: "MARKETPLACE_METRIC",
      metric: "completedOrders",
      count: 1,
    },
    isGlobal: true,
  },
  {
    name: "Community Builder",
    slug: "community-builder",
    description: "Awarded for creating a community.",
    icon: "users",
    category: "Community",
    rarity: "UNCOMMON",
    xpReward: 50,
    criteria: { type: "XP_ACTION", action: "CREATE_COMMUNITY", count: 1 },
    isGlobal: true,
  },
  {
    name: "Top Mentor",
    slug: "top-mentor",
    description: "Awarded for completing mentorship milestones.",
    icon: "graduation-cap",
    category: "Mentorship",
    rarity: "EPIC",
    xpReward: 150,
    criteria: {
      type: "MENTORSHIP_METRIC",
      metric: "completedMentorships",
      count: 5,
    },
    isGlobal: true,
  },
  {
    name: "Forum Contributor",
    slug: "forum-contributor",
    description: "Awarded for contributing to forum discussions.",
    icon: "messages-square",
    category: "Forums",
    rarity: "UNCOMMON",
    xpReward: 40,
    criteria: { type: "XP_ACTION", action: "CREATE_FORUM_POST", count: 10 },
    isGlobal: true,
  },
  {
    name: "Leadership Voice",
    slug: "leadership-voice",
    description: "Awarded for active participation in polls and suggestions.",
    icon: "megaphone",
    category: "Leadership",
    rarity: "EPIC",
    xpReward: 125,
    criteria: {
      type: "COMPOSITE",
      actions: [
        { action: "VOTE_IN_POLL", count: 10 },
        { action: "SUBMIT_SUGGESTION", count: 3 },
      ],
    },
    isGlobal: true,
  },
];

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function animationForBadgeRarity(rarity: unknown) {
  if (rarity === "EPIC" || rarity === "LEGENDARY") return "TROPHY";
  if (rarity === "RARE") return "SPOTLIGHT";

  return "BADGE_POP";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageBadges(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.BADGE_MANAGE)
  );
}

function assertCanManageBadges(actor: AuthUser) {
  if (!canManageBadges(actor)) {
    throw forbidden("Badge management access is required.");
  }
}

function scopedBadgeUniversity(actor: AuthUser, requested?: string | null) {
  if (isSuperAdmin(actor)) return requested ?? null;
  if (!actor.universityId) throw forbidden("University scope is required.");

  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot manage badges outside your university.");
  }

  return actor.universityId;
}

function assertCanReadUserBadges(
  actor: AuthUser,
  userId: string,
  universityId: string,
) {
  if (actor.id === userId) return;
  if (isSuperAdmin(actor)) return;
  if (
    hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles) &&
    actor.universityId === universityId
  ) {
    return;
  }

  throw forbidden("Cannot access another user's badges.");
}

function serializeBadge(badge: Record<string, unknown>) {
  return {
    id: String(badge._id),
    universityId:
      typeof badge.universityId === "string" ? badge.universityId : null,
    name: String(badge.name),
    slug: String(badge.slug),
    description:
      typeof badge.description === "string" ? badge.description : null,
    icon:
      typeof badge.icon === "string"
        ? badge.icon
        : typeof badge.iconUrl === "string"
          ? badge.iconUrl
          : null,
    category: String(badge.category),
    rarity: String(badge.rarity ?? "COMMON"),
    xpReward: Number(badge.xpReward ?? 0),
    criteria: badge.criteria ?? null,
    isGlobal: Boolean(badge.isGlobal),
    status: String(badge.status ?? "ACTIVE"),
    metadata: badge.metadata ?? null,
    createdAt: serializeDate(badge.createdAt),
    updatedAt: serializeDate(badge.updatedAt),
  };
}

function serializeUserBadge(
  userBadge: Record<string, unknown>,
  badge?: Record<string, unknown>,
) {
  return {
    id: String(userBadge._id),
    universityId: String(userBadge.universityId),
    userId: String(userBadge.userId),
    badgeId: String(userBadge.badgeId),
    badge: badge ? serializeBadge(badge) : null,
    earnedAt: serializeDate(userBadge.earnedAt),
    displayOnProfile: Boolean(userBadge.displayOnProfile ?? true),
    source: typeof userBadge.source === "string" ? userBadge.source : null,
    metadata: userBadge.metadata ?? null,
    createdAt: serializeDate(userBadge.createdAt),
    updatedAt: serializeDate(userBadge.updatedAt),
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

async function resolveBadgeForUser(input: {
  badgeId?: string;
  slug?: string;
  universityId: string;
}) {
  const scopeFilter = {
    $or: [
      { isGlobal: true },
      { universityId: null },
      { universityId: input.universityId },
    ],
  };
  const badge = await BadgeModel.findOne({
    ...(input.badgeId ? { _id: input.badgeId } : { slug: input.slug }),
    status: "ACTIVE",
    ...deletedFilter,
    ...scopeFilter,
  }).lean();

  if (!badge) throw notFound("Badge not found.");

  return badge as Record<string, unknown>;
}

async function badgesById(badgeIds: string[]) {
  const badges = await BadgeModel.find({
    _id: { $in: Array.from(new Set(badgeIds)) },
  }).lean();

  return new Map(
    badges.map((badge) => [
      String(badge._id),
      badge as Record<string, unknown>,
    ]),
  );
}

export async function createBadge(input: unknown) {
  const actor = await requireAuth();
  assertCanManageBadges(actor);
  await connectMongo();
  const payload = createBadgeSchema.parse(input);
  const universityId = scopedBadgeUniversity(actor, payload.universityId);
  const slug = payload.slug ?? slugify(payload.name);

  if (!slug) throw forbidden("Badge slug is required.");

  const existing = await BadgeModel.exists({
    universityId,
    slug,
    ...deletedFilter,
  });
  if (existing) throw forbidden("Badge slug already exists.");

  const badge = await BadgeModel.create({
    _id: randomUUID(),
    universityId,
    name: payload.name,
    slug,
    description: payload.description ?? null,
    icon: payload.icon ?? null,
    iconUrl: payload.icon ?? null,
    category: payload.category,
    rarity: payload.rarity,
    xpReward: payload.xpReward,
    criteria: payload.criteria,
    isGlobal: isSuperAdmin(actor) ? payload.isGlobal : false,
    status: payload.status,
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "BADGE_CREATED",
    entityType: "badge",
    entityId: String(badge._id),
    after: serializeBadge(badge.toObject()),
  });

  return serializeBadge(badge.toObject());
}

export async function seedDefaultBadges(input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageBadges(actor);
  await connectMongo();
  const payload = createBadgeSchema
    .pick({ universityId: true })
    .partial()
    .parse(input);
  const universityId = scopedBadgeUniversity(actor, payload.universityId);
  const created: Array<Record<string, unknown>> = [];
  const existing: Array<Record<string, unknown>> = [];

  for (const definition of DEFAULT_BADGES) {
    const current = await BadgeModel.findOne({
      universityId,
      slug: definition.slug,
      ...deletedFilter,
    }).lean();

    if (current) {
      existing.push(current as Record<string, unknown>);
      continue;
    }

    const badge = await BadgeModel.create({
      _id: randomUUID(),
      universityId,
      ...definition,
      iconUrl: definition.icon ?? null,
      isGlobal: isSuperAdmin(actor) && !universityId,
      status: "ACTIVE",
      createdById: actor.id,
    });
    created.push(badge.toObject());
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "BADGE_DEFAULTS_SEEDED",
    entityType: "badge",
    entityId: null,
    metadata: {
      created: created.length,
      existing: existing.length,
    },
  });

  return {
    created: created.map(serializeBadge),
    existing: existing.map(serializeBadge),
  };
}

export async function listBadges(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = listBadgesQuerySchema.parse(query);
  const universityId = scopedBadgeUniversity(actor, filters.universityId);
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
  if (filters.category) dbFilter.category = filters.category;
  if (filters.rarity) dbFilter.rarity = filters.rarity;
  if (filters.q) {
    dbFilter.$text = { $search: filters.q };
  }
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const badges = await BadgeModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return badges.map((badge) =>
    serializeBadge(badge as Record<string, unknown>),
  );
}

export async function grantBadgeToUser(actor: AuthUser, input: unknown) {
  await connectMongo();
  const payload = earnBadgeSchema.parse(input);
  const user = await getActiveUserOrThrow(payload.userId);

  if (!isSuperAdmin(actor) && actor.universityId !== user.universityId) {
    throw forbidden("Cannot award badges outside your university.");
  }

  const badge = await resolveBadgeForUser({
    badgeId: payload.badgeId,
    slug: payload.slug,
    universityId: user.universityId,
  });
  const existing = await UserBadgeModel.findOne({
    userId: payload.userId,
    badgeId: String(badge._id),
  }).lean();

  if (existing) {
    return {
      userBadge: serializeUserBadge(existing as Record<string, unknown>, badge),
      idempotent: true,
    };
  }

  const userBadge = await UserBadgeModel.create({
    _id: randomUUID(),
    universityId: user.universityId,
    userId: payload.userId,
    badgeId: String(badge._id),
    earnedAt: new Date(),
    displayOnProfile: payload.displayOnProfile,
    source: payload.source ?? null,
    metadata: payload.metadata ?? null,
  });
  const serialized = serializeUserBadge(userBadge.toObject(), badge);
  const xpReward = Number(badge.xpReward ?? 0);

  await writeAuditLog({
    actorId: actor.id,
    universityId: user.universityId,
    action: "BADGE_EARNED",
    entityType: "user_badge",
    entityId: String(userBadge._id),
    after: serialized,
  });

  await createSystemNotification({
    target: {
      recipientId: payload.userId,
      universityId: user.universityId,
    },
    senderId: actor.id,
    type: "BADGE",
    title: "Badge earned",
    message: `You earned the ${String(badge.name)} badge.`,
    entityType: "user_badge",
    entityId: String(userBadge._id),
    priority: "NORMAL",
    metadata: {
      badgeId: String(badge._id),
      badgeSlug: String(badge.slug),
      rarity: String(badge.rarity ?? "COMMON"),
    },
  });

  await createActivity({
    actorId: payload.userId,
    actorType: "USER",
    universityId: user.universityId,
    collegeId: typeof user.collegeId === "string" ? user.collegeId : null,
    departmentId:
      typeof user.departmentId === "string" ? user.departmentId : null,
    activityType: "BADGE_EARNED",
    title: `${String(badge.name)} badge earned`,
    description:
      typeof badge.description === "string" ? badge.description : null,
    entityType: "user_badge",
    entityId: String(userBadge._id),
    visibility: "PRIVATE",
    score: xpReward,
    metadata: {
      badgeId: String(badge._id),
      badgeSlug: String(badge.slug),
      rarity: String(badge.rarity ?? "COMMON"),
    },
  });

  await createRewardEventForUser(actor, {
    userId: payload.userId,
    trigger: "BADGE_EARNED",
    title: "Badge earned",
    description: `You earned the ${String(badge.name)} badge.`,
    reward: {
      type: "BADGE",
      label: String(badge.name),
      rarity: String(badge.rarity ?? "COMMON"),
    },
    xp: xpReward,
    badge: {
      id: String(badge._id),
      name: String(badge.name),
      slug: String(badge.slug),
      icon:
        typeof badge.icon === "string"
          ? badge.icon
          : typeof badge.iconUrl === "string"
            ? badge.iconUrl
            : null,
      rarity: String(badge.rarity ?? "COMMON"),
    },
    animationType: animationForBadgeRarity(badge.rarity),
    entityType: "user_badge",
    entityId: String(userBadge._id),
    metadata: {
      badgeId: String(badge._id),
      badgeSlug: String(badge.slug),
      source: payload.source ?? null,
    },
  });

  if (xpReward > 0) {
    await awardXpToUser(actor, {
      userId: payload.userId,
      action: "EARN_BADGE",
      xpAwarded: xpReward,
      sourceType: "SYSTEM",
      sourceId: String(userBadge._id),
      idempotencyKey: `badge-xp:${String(userBadge._id)}`,
      metadata: {
        badgeId: String(badge._id),
        badgeSlug: String(badge.slug),
      },
    });
  }

  return {
    userBadge: serialized,
    idempotent: false,
  };
}

export async function earnBadge(input: unknown) {
  const actor = await requireAuth();
  assertCanManageBadges(actor);
  await connectMongo();

  return grantBadgeToUser(actor, input);
}

export async function getBadgeCollection(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = userBadgeQuerySchema.parse(query);
  const targetUserId = filters.userId ?? actor.id;
  const user = await getActiveUserOrThrow(targetUserId);

  assertCanReadUserBadges(actor, targetUserId, user.universityId);

  const dbFilter: Record<string, unknown> = {
    userId: targetUserId,
    universityId: user.universityId,
  };
  if (filters.displayOnly) dbFilter.displayOnProfile = true;
  if (filters.cursor) dbFilter.earnedAt = { $lt: new Date(filters.cursor) };

  const userBadges = await UserBadgeModel.find(dbFilter)
    .sort({ earnedAt: -1 })
    .limit(filters.limit)
    .lean();
  const badgeMap = await badgesById(
    userBadges.map((userBadge) => String(userBadge.badgeId)),
  );
  const collection = userBadges
    .map((userBadge) => {
      const badge = badgeMap.get(String(userBadge.badgeId));
      if (!badge) return null;
      if (filters.category && badge.category !== filters.category) return null;
      if (filters.rarity && badge.rarity !== filters.rarity) return null;

      return serializeUserBadge(userBadge as Record<string, unknown>, badge);
    })
    .filter(Boolean);

  return collection;
}

export async function getBadgeHistory(query: unknown = {}) {
  return getBadgeCollection(query);
}

export async function updateUserBadgeDisplay(
  userBadgeId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = updateUserBadgeDisplaySchema.parse(input);
  const userBadge = await UserBadgeModel.findById(userBadgeId).lean();

  if (!userBadge) throw notFound("User badge not found.");

  assertCanReadUserBadges(
    actor,
    String(userBadge.userId),
    String(userBadge.universityId),
  );

  if (actor.id !== userBadge.userId && !canManageBadges(actor)) {
    throw forbidden(
      "Only the owner or a badge manager can update display state.",
    );
  }

  const updated = await UserBadgeModel.findOneAndUpdate(
    { _id: userBadgeId },
    {
      $set: {
        displayOnProfile: payload.displayOnProfile,
      },
    },
    { new: true },
  ).lean();
  const badge = await BadgeModel.findById(updated?.badgeId).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(userBadge.universityId),
    action: "BADGE_DISPLAY_UPDATED",
    entityType: "user_badge",
    entityId: userBadgeId,
    before: {
      displayOnProfile: Boolean(userBadge.displayOnProfile ?? true),
    },
    after: {
      displayOnProfile: payload.displayOnProfile,
    },
  });

  return serializeUserBadge(
    updated as Record<string, unknown>,
    badge as Record<string, unknown> | undefined,
  );
}
