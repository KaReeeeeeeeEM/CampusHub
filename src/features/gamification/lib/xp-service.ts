import { randomUUID } from "node:crypto";

import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createRewardEventForUser } from "@/features/gamification/lib/reward-event-service";
import {
  awardXpSchema,
  removeXpSchema,
  xpBalanceQuerySchema,
  xpHistoryQuerySchema,
  xpLeaderboardQuerySchema,
  type XpActionInput,
} from "@/features/gamification/lib/xp-schemas";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  UserModel,
  UserXpProfileModel,
  XpTransactionModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

const DEFAULT_XP_BY_ACTION: Record<XpActionInput, number> = {
  DAILY_LOGIN: 5,
  CREATE_PROJECT: 50,
  PUBLISH_PROJECT: 100,
  RECEIVE_PROJECT_STAR: 10,
  CREATE_FORUM_POST: 15,
  RECEIVE_FORUM_UPVOTE: 5,
  JOIN_EVENT: 10,
  ATTEND_EVENT: 30,
  CREATE_MARKETPLACE_PRODUCT: 20,
  RECEIVE_ORDER_REQUEST: 20,
  COMPLETE_CAREER_PROFILE: 80,
  APPLY_OPPORTUNITY: 25,
  BECOME_MENTOR: 60,
  COMPLETE_MENTORSHIP: 120,
  JOIN_COMMUNITY: 10,
  CREATE_COMMUNITY: 40,
  VOTE_IN_POLL: 10,
  SUBMIT_SUGGESTION: 20,
  EARN_BADGE: 0,
  COMPLETE_ACHIEVEMENT: 0,
  STREAK_MILESTONE: 0,
};

const ACTION_LABELS: Record<XpActionInput, string> = {
  DAILY_LOGIN: "Daily Login",
  CREATE_PROJECT: "Create Project",
  PUBLISH_PROJECT: "Publish Project",
  RECEIVE_PROJECT_STAR: "Receive Project Star",
  CREATE_FORUM_POST: "Create Forum Post",
  RECEIVE_FORUM_UPVOTE: "Receive Forum Upvote",
  JOIN_EVENT: "Join Event",
  ATTEND_EVENT: "Attend Event",
  CREATE_MARKETPLACE_PRODUCT: "Create Marketplace Product",
  RECEIVE_ORDER_REQUEST: "Receive Order Request",
  COMPLETE_CAREER_PROFILE: "Complete Career Profile",
  APPLY_OPPORTUNITY: "Apply Opportunity",
  BECOME_MENTOR: "Become Mentor",
  COMPLETE_MENTORSHIP: "Complete Mentorship",
  JOIN_COMMUNITY: "Join Community",
  CREATE_COMMUNITY: "Create Community",
  VOTE_IN_POLL: "Vote In Poll",
  SUBMIT_SUGGESTION: "Submit Suggestion",
  EARN_BADGE: "Earn Badge",
  COMPLETE_ACHIEVEMENT: "Complete Achievement",
  STREAK_MILESTONE: "Streak Milestone",
};

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageXp(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.XP_AWARD)
  );
}

function calculateLevel(totalXp: number) {
  if (totalXp <= 0) return 1;

  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

async function refreshUniversityXpRanks(universityId: string) {
  const profiles = await UserXpProfileModel.find({ universityId })
    .select("_id userId")
    .sort({ totalXp: -1, updatedAt: 1, _id: 1 })
    .lean();

  if (!profiles.length) return new Map<string, number>();

  const ranks = new Map(
    profiles.map((profile, index) => [String(profile.userId), index + 1]),
  );

  await UserXpProfileModel.bulkWrite(
    profiles.map((profile, index) => ({
      updateOne: {
        filter: { _id: profile._id },
        update: { $set: { rank: index + 1 } },
      },
    })),
  );

  return ranks;
}

function periodStart(timeframe: "TODAY" | "WEEK" | "MONTH" | "YEAR") {
  const now = new Date();
  const start = new Date(now);

  if (timeframe === "TODAY") {
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  if (timeframe === "WEEK") {
    start.setUTCDate(now.getUTCDate() - 7);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  if (timeframe === "MONTH") {
    start.setUTCMonth(now.getUTCMonth() - 1);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  start.setUTCFullYear(now.getUTCFullYear() - 1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function assertCanManageTarget(actor: AuthUser, universityId: string) {
  if (!canManageXp(actor)) {
    throw forbidden("XP management access is required.");
  }

  if (!isSuperAdmin(actor) && actor.universityId !== universityId) {
    throw forbidden("Cannot manage XP outside your university.");
  }
}

function assertCanReadUserXp(
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

  throw forbidden("Cannot access another user's XP.");
}

function assertLeaderboardScope(actor: AuthUser, universityId: string) {
  if (!hasPermission(actor, PERMISSIONS.LEADERBOARD_READ)) {
    throw forbidden("Leaderboard access is required.");
  }

  if (!isSuperAdmin(actor) && actor.universityId !== universityId) {
    throw forbidden("Cannot access another university leaderboard.");
  }
}

function serializeTransaction(transaction: Record<string, unknown>) {
  return {
    id: String(transaction._id),
    universityId: String(transaction.universityId),
    userId: String(transaction.userId),
    action: String(transaction.action),
    xpAwarded: Number(transaction.xpAwarded ?? transaction.points ?? 0),
    sourceType: String(transaction.sourceType),
    sourceId:
      typeof transaction.sourceId === "string" ? transaction.sourceId : null,
    transactionType: String(transaction.transactionType ?? "AWARD"),
    reason: String(transaction.reason),
    metadata: transaction.metadata ?? null,
    createdAt: serializeDate(transaction.createdAt),
  };
}

function serializeProfile(profile: Record<string, unknown> | null) {
  return {
    id: profile ? String(profile._id) : null,
    universityId:
      profile && typeof profile.universityId === "string"
        ? profile.universityId
        : null,
    userId:
      profile && typeof profile.userId === "string" ? profile.userId : null,
    totalXp: Number(profile?.totalXp ?? 0),
    level: Number(profile?.level ?? 1),
    rank: typeof profile?.rank === "number" ? profile.rank : null,
    weeklyXp: Number(profile?.weeklyXp ?? 0),
    monthlyXp: Number(profile?.monthlyXp ?? 0),
    lastActivityAt: serializeDate(profile?.lastActivityAt),
    createdAt: serializeDate(profile?.createdAt),
    updatedAt: serializeDate(profile?.updatedAt),
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

async function upsertProfileDelta(input: {
  universityId: string;
  userId: string;
  delta: number;
}) {
  const now = new Date();
  const previousProfile = await UserXpProfileModel.findOne({
    universityId: input.universityId,
    userId: input.userId,
  }).lean();
  const previousLevel = Number(previousProfile?.level ?? 1);
  const profile = await UserXpProfileModel.findOneAndUpdate(
    {
      universityId: input.universityId,
      userId: input.userId,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: input.universityId,
        userId: input.userId,
      },
      $inc: {
        totalXp: input.delta,
        weeklyXp: input.delta,
        monthlyXp: input.delta,
      },
      $set: {
        lastActivityAt: now,
      },
    },
    { new: true, upsert: true },
  ).lean();

  const totalXp = Math.max(0, Number(profile?.totalXp ?? 0));
  const weeklyXp = Math.max(0, Number(profile?.weeklyXp ?? 0));
  const monthlyXp = Math.max(0, Number(profile?.monthlyXp ?? 0));
  const level = calculateLevel(totalXp);

  await UserXpProfileModel.updateOne(
    { _id: profile?._id },
    {
      $set: {
        totalXp,
        weeklyXp,
        monthlyXp,
        level,
      },
    },
  );

  return {
    ...(profile as Record<string, unknown>),
    totalXp,
    weeklyXp,
    monthlyXp,
    level,
    previousLevel,
    levelUp: input.delta > 0 && level > previousLevel,
  };
}

async function emitAwardSideEffects(input: {
  actor: AuthUser;
  user: Record<string, unknown> & {
    _id: string;
    universityId: string;
    collegeId?: string | null;
    departmentId?: string | null;
  };
  transactionId: string;
  action: XpActionInput;
  amount: number;
}) {
  try {
    await createSystemNotification({
      target: {
        recipientId: String(input.user._id),
        universityId: input.user.universityId,
      },
      senderId: input.actor.id,
      type: "XP",
      title: "XP earned",
      message: `You earned ${input.amount} XP for ${ACTION_LABELS[input.action]}.`,
      entityType: "xp_transaction",
      entityId: input.transactionId,
      priority: "LOW",
      metadata: {
        action: input.action,
        xpAwarded: input.amount,
      },
    });

    await createActivity({
      actorId: String(input.user._id),
      actorType: "USER",
      universityId: input.user.universityId,
      collegeId:
        typeof input.user.collegeId === "string" ? input.user.collegeId : null,
      departmentId:
        typeof input.user.departmentId === "string"
          ? input.user.departmentId
          : null,
      activityType: "XP_EARNED",
      title: `${ACTION_LABELS[input.action]} XP earned`,
      description: `${input.amount} XP awarded.`,
      entityType: "xp_transaction",
      entityId: input.transactionId,
      visibility: "PRIVATE",
      score: input.amount,
      metadata: {
        action: input.action,
        xpAwarded: input.amount,
      },
    });
  } catch (error) {
    await writeAuditLog({
      actorId: input.actor.id,
      universityId: input.user.universityId,
      action: "ACTIVITY_FEED_GENERATION_FAILED",
      entityType: "xp_transaction",
      entityId: input.transactionId,
      metadata: {
        feature: "XP_ENGINE",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export async function awardXpToUser(
  actor: AuthUser,
  input: unknown,
  options: { enforceManage?: boolean } = {},
) {
  await connectPostgres();
  const payload = awardXpSchema.parse(input);
  const user = await getActiveUserOrThrow(payload.userId);

  if (options.enforceManage) {
    assertCanManageTarget(actor, user.universityId);
  } else if (!isSuperAdmin(actor) && actor.universityId !== user.universityId) {
    throw forbidden("Cannot award XP outside your university.");
  }

  if (payload.idempotencyKey) {
    const existing = await XpTransactionModel.findOne({
      universityId: user.universityId,
      userId: payload.userId,
      idempotencyKey: payload.idempotencyKey,
    }).lean();

    if (existing) {
      const profile = await UserXpProfileModel.findOne({
        universityId: user.universityId,
        userId: payload.userId,
      }).lean();

      return {
        transaction: serializeTransaction(existing as Record<string, unknown>),
        balance: serializeProfile(profile as Record<string, unknown> | null),
        idempotent: true,
      };
    }
  }

  const amount = payload.xpAwarded ?? DEFAULT_XP_BY_ACTION[payload.action];
  const transactionId = randomUUID();
  const transaction = await XpTransactionModel.create({
    _id: transactionId,
    universityId: user.universityId,
    userId: payload.userId,
    action: payload.action,
    xpAwarded: amount,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId ?? null,
    transactionType: "AWARD",
    idempotencyKey: payload.idempotencyKey ?? null,
    points: amount,
    reason: ACTION_LABELS[payload.action],
    metadata: payload.metadata ?? null,
  });
  const profile = await upsertProfileDelta({
    universityId: user.universityId,
    userId: payload.userId,
    delta: amount,
  });
  const ranks = await refreshUniversityXpRanks(user.universityId);
  const rankedProfile = {
    ...profile,
    rank: ranks.get(payload.userId) ?? null,
  };

  await writeAuditLog({
    actorId: actor.id,
    universityId: user.universityId,
    action: "XP_AWARDED",
    entityType: "xp_transaction",
    entityId: transactionId,
    after: {
      userId: payload.userId,
      action: payload.action,
      xpAwarded: amount,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId ?? null,
    },
  });

  await emitAwardSideEffects({
    actor,
    user,
    transactionId,
    action: payload.action,
    amount,
  });

  if (amount > 0) {
    await createRewardEventForUser(actor, {
      userId: payload.userId,
      trigger: "XP_EARNED",
      title: `${amount} XP earned`,
      description: `You earned ${amount} XP for ${ACTION_LABELS[payload.action]}.`,
      reward: {
        type: "XP",
        label: ACTION_LABELS[payload.action],
        amount,
      },
      xp: amount,
      animationType: "CONFETTI",
      entityType: "xp_transaction",
      entityId: transactionId,
      metadata: {
        action: payload.action,
        xpAwarded: amount,
        totalXp: profile.totalXp,
        level: profile.level,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId ?? null,
      },
    });
  }

  if (profile.levelUp) {
    await createRewardEventForUser(actor, {
      userId: payload.userId,
      trigger: "LEVEL_UP",
      title: "Level up",
      description: `You reached level ${profile.level}.`,
      reward: {
        type: "LEVEL",
        previousLevel: profile.previousLevel,
        level: profile.level,
      },
      xp: amount,
      animationType: "LEVEL_UP",
      entityType: "user_xp_profile",
      entityId: String((profile as Record<string, unknown>)._id),
      metadata: {
        previousLevel: profile.previousLevel,
        level: profile.level,
        totalXp: profile.totalXp,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId ?? null,
      },
    });
  }

  return {
    transaction: serializeTransaction(transaction.toObject()),
    balance: serializeProfile(rankedProfile),
    idempotent: false,
  };
}

export async function awardXp(input: unknown) {
  const actor = await requireAuth();

  return awardXpToUser(actor, input, { enforceManage: true });
}

export async function removeXp(input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = removeXpSchema.parse(input);
  const user = await getActiveUserOrThrow(payload.userId);

  assertCanManageTarget(actor, user.universityId);

  const existingProfile = await UserXpProfileModel.findOne({
    universityId: user.universityId,
    userId: payload.userId,
  }).lean();

  if (!existingProfile) throw notFound("XP balance not found.");

  const currentTotal = Number(existingProfile.totalXp ?? 0);
  const actualRemoved = Math.min(payload.xpAmount, currentTotal);

  if (actualRemoved <= 0) throw forbidden("No XP is available to remove.");

  const transactionId = randomUUID();
  const nextTotalXp = Math.max(0, currentTotal - actualRemoved);
  const nextWeeklyXp = Math.max(
    0,
    Number(existingProfile.weeklyXp ?? 0) - actualRemoved,
  );
  const nextMonthlyXp = Math.max(
    0,
    Number(existingProfile.monthlyXp ?? 0) - actualRemoved,
  );
  const nextLevel = calculateLevel(nextTotalXp);

  const transaction = await XpTransactionModel.create({
    _id: transactionId,
    universityId: user.universityId,
    userId: payload.userId,
    action: payload.action,
    xpAwarded: -actualRemoved,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId ?? null,
    transactionType: "REMOVE",
    idempotencyKey: null,
    points: -actualRemoved,
    reason: payload.reason ?? `Removed XP for ${ACTION_LABELS[payload.action]}`,
    metadata: payload.metadata ?? null,
  });

  const profile = await UserXpProfileModel.findOneAndUpdate(
    {
      universityId: user.universityId,
      userId: payload.userId,
    },
    {
      $set: {
        totalXp: nextTotalXp,
        weeklyXp: nextWeeklyXp,
        monthlyXp: nextMonthlyXp,
        level: nextLevel,
        lastActivityAt: new Date(),
      },
    },
    { new: true },
  ).lean();
  const ranks = await refreshUniversityXpRanks(user.universityId);
  const rankedProfile = {
    ...(profile as Record<string, unknown> | null),
    rank: ranks.get(payload.userId) ?? null,
  };

  await writeAuditLog({
    actorId: actor.id,
    universityId: user.universityId,
    action: "XP_REMOVED",
    entityType: "xp_transaction",
    entityId: transactionId,
    after: {
      userId: payload.userId,
      action: payload.action,
      xpRemoved: actualRemoved,
      requestedRemoval: payload.xpAmount,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId ?? null,
    },
  });

  return {
    transaction: serializeTransaction(transaction.toObject()),
    balance: serializeProfile(rankedProfile),
  };
}

export async function getXpHistory(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = xpHistoryQuerySchema.parse(query);
  const targetUserId = filters.userId ?? actor.id;
  const user = await getActiveUserOrThrow(targetUserId);

  assertCanReadUserXp(actor, targetUserId, user.universityId);

  const dbFilter: Record<string, unknown> = {
    universityId: user.universityId,
    userId: targetUserId,
  };

  if (filters.action) dbFilter.action = filters.action;
  if (filters.sourceType) dbFilter.sourceType = filters.sourceType;
  if (filters.sourceId) dbFilter.sourceId = filters.sourceId;
  if (filters.transactionType)
    dbFilter.transactionType = filters.transactionType;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const transactions = await XpTransactionModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return transactions.map((transaction) =>
    serializeTransaction(transaction as Record<string, unknown>),
  );
}

export async function getXpBalance(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = xpBalanceQuerySchema.parse(query);
  const targetUserId = filters.userId ?? actor.id;
  const user = await getActiveUserOrThrow(targetUserId);

  assertCanReadUserXp(actor, targetUserId, user.universityId);

  const profile = await UserXpProfileModel.findOne({
    universityId: user.universityId,
    userId: targetUserId,
  }).lean();

  return {
    ...serializeProfile(profile as Record<string, unknown> | null),
    universityId: user.universityId,
    userId: targetUserId,
  };
}

export async function getXpLeaderboard(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = xpLeaderboardQuerySchema.parse(query);
  const universityId = filters.universityId ?? actor.universityId;

  if (!universityId) throw forbidden("University scope is required.");
  assertLeaderboardScope(actor, universityId);

  if (filters.timeframe === "ALL_TIME") {
    const profiles = await UserXpProfileModel.find({ universityId })
      .sort({ totalXp: -1, updatedAt: 1 })
      .limit(filters.limit)
      .lean();

    return profiles.map((profile, index) => ({
      rank: index + 1,
      userId: String(profile.userId),
      universityId: String(profile.universityId),
      totalXp: Number(profile.totalXp ?? 0),
      periodXp: Number(profile.totalXp ?? 0),
      level: Number(profile.level ?? 1),
      lastActivityAt: serializeDate(profile.lastActivityAt),
    }));
  }

  const start = periodStart(filters.timeframe);
  const rows = await XpTransactionModel.aggregate<{
    _id: string;
    periodXp: number;
  }>([
    {
      $match: {
        universityId,
        createdAt: { $gte: start },
      },
    },
    {
      $group: {
        _id: "$userId",
        periodXp: { $sum: "$xpAwarded" },
      },
    },
    { $match: { periodXp: { $gt: 0 } } },
    { $sort: { periodXp: -1, _id: 1 } },
    { $limit: filters.limit },
  ]);
  const userIds = rows.map((row) => row._id);
  const profiles = await UserXpProfileModel.find({
    universityId,
    userId: { $in: userIds },
  }).lean();
  const profileByUserId = new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );

  return rows.map((row, index) => {
    const profile = profileByUserId.get(row._id);

    return {
      rank: index + 1,
      userId: row._id,
      universityId,
      totalXp: Number(profile?.totalXp ?? 0),
      periodXp: Number(row.periodXp ?? 0),
      level: Number(profile?.level ?? 1),
      lastActivityAt: serializeDate(profile?.lastActivityAt),
    };
  });
}

export const XP_ACTION_DEFAULTS = DEFAULT_XP_BY_ACTION;
