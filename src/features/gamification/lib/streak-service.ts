import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { grantBadgeToUser } from "@/features/gamification/lib/badge-service";
import { createRewardEventForUser } from "@/features/gamification/lib/reward-event-service";
import {
  grantRecoveryTokenSchema,
  recordStreakActivitySchema,
  streakQuerySchema,
  streakSummaryQuerySchema,
  type StreakTypeInput,
} from "@/features/gamification/lib/streak-schemas";
import { awardXpToUser } from "@/features/gamification/lib/xp-service";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { StreakModel, UserModel } from "@/lib/db/models";
import { STREAK_MILESTONE_REWARDS as KIBO_STREAK_MILESTONE_REWARDS } from "@/lib/kibo/config";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };
const PLATFORM_STREAK_UNIVERSITY_ID = "platform";

const STREAK_MILESTONES = KIBO_STREAK_MILESTONE_REWARDS;

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageStreaks(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.BADGE_MANAGE)
  );
}

function startOfUtcDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);

  return date;
}

function dayDiff(from: Date, to: Date) {
  const start = startOfUtcDay(from).getTime();
  const end = startOfUtcDay(to).getTime();

  return Math.floor((end - start) / 86_400_000);
}

function serializeStreak(streak: Record<string, unknown>) {
  return {
    id: String(streak._id),
    universityId: String(streak.universityId),
    userId: String(streak.userId),
    streakType: String(streak.streakType),
    currentCount: Number(streak.currentCount ?? 0),
    longestCount: Number(streak.longestCount ?? 0),
    lastActivityDate: serializeDate(streak.lastActivityDate),
    lastBrokenAt: serializeDate(streak.lastBrokenAt),
    recoveryTokens: Number(streak.recoveryTokens ?? 0),
    recoveryCount: Number(streak.recoveryCount ?? 0),
    lastRecoveryAt: serializeDate(streak.lastRecoveryAt),
    milestonesEarned: Array.isArray(streak.milestonesEarned)
      ? streak.milestonesEarned.map(Number)
      : [],
    milestoneBadgesEarned: Array.isArray(streak.milestoneBadgesEarned)
      ? streak.milestoneBadgesEarned.map(String)
      : [],
    status: String(streak.status ?? "ACTIVE"),
    metadata: streak.metadata ?? null,
    createdAt: serializeDate(streak.createdAt),
    updatedAt: serializeDate(streak.updatedAt),
  };
}

function coerceDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function effectiveStreakState(streak: Record<string, unknown> | null) {
  const today = startOfUtcDay(new Date());
  const lastActivityDate = coerceDate(streak?.lastActivityDate);
  const storedCurrentCount = Number(streak?.currentCount ?? 0);
  const storedStatus = String(streak?.status ?? "ACTIVE");
  const daysSinceActivity = lastActivityDate
    ? dayDiff(lastActivityDate, today)
    : null;
  const broken =
    storedStatus === "BROKEN" ||
    !lastActivityDate ||
    (daysSinceActivity !== null && daysSinceActivity > 1);
  const currentCount = broken ? 0 : storedCurrentCount;

  return {
    today,
    lastActivityDate,
    daysSinceActivity,
    currentCount,
    status: broken ? "BROKEN" : "ACTIVE",
  };
}

function buildWeekActivity(input: {
  currentCount: number;
  lastActivityDate: Date | null;
}) {
  const today = startOfUtcDay(new Date());
  const monday = new Date(today);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() - (day === 0 ? 6 : day - 1));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const active =
      input.currentCount > 0 && input.lastActivityDate
        ? dayDiff(date, input.lastActivityDate) >= 0 &&
          dayDiff(date, input.lastActivityDate) < input.currentCount
        : false;

    return {
      label: ["M", "T", "W", "T", "F", "S", "S"][index],
      date: date.toISOString().slice(0, 10),
      active,
      isToday: dayDiff(date, today) === 0,
    };
  });
}

function serializeStreakSummary(streak: Record<string, unknown> | null) {
  const state = effectiveStreakState(streak);
  const weeklyActivity = buildWeekActivity({
    currentCount: state.currentCount,
    lastActivityDate: state.lastActivityDate,
  });
  const activeDaysThisWeek = weeklyActivity.filter((day) => day.active).length;

  return {
    streak: streak ? serializeStreak(streak) : null,
    streakType: String(streak?.streakType ?? "DAILY_LOGIN"),
    currentCount: state.currentCount,
    longestCount: Number(streak?.longestCount ?? 0),
    status: state.status,
    lastActivityDate: state.lastActivityDate?.toISOString() ?? null,
    daysSinceActivity: state.daysSinceActivity,
    recoveryTokens: Number(streak?.recoveryTokens ?? 0),
    recoveryCount: Number(streak?.recoveryCount ?? 0),
    milestonesEarned: Array.isArray(streak?.milestonesEarned)
      ? streak.milestonesEarned.map(Number)
      : [],
    weeklyActivity,
    activeDaysThisWeek,
    weekGoal: 7,
    progressPercent: Math.round((activeDaysThisWeek / 7) * 100),
  };
}

async function getActiveUserOrThrow(userId: string) {
  const user = await UserModel.findOne({
    _id: userId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!user) throw notFound("User not found.");

  return user as Record<string, unknown> & {
    _id: string;
    universityId: string;
    hasUniversityScope?: boolean;
  };
}

function streakUniversityId(user: Record<string, unknown>) {
  return typeof user.universityId === "string"
    ? user.universityId
    : PLATFORM_STREAK_UNIVERSITY_ID;
}

function hasUniversityScope(user: Record<string, unknown>) {
  return typeof user.universityId === "string";
}

function assertCanAccessUserStreaks(
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

  throw forbidden("Cannot access another user's streaks.");
}

function assertCanMutateUserStreak(
  actor: AuthUser,
  userId: string,
  universityId: string,
) {
  if (actor.id === userId) return;
  if (
    canManageStreaks(actor) &&
    (isSuperAdmin(actor) || actor.universityId === universityId)
  ) {
    return;
  }

  throw forbidden("Cannot update another user's streak.");
}

function milestoneRewardsForCount(
  currentCount: number,
  existingMilestones: number[],
) {
  return STREAK_MILESTONES.filter(
    (milestone) =>
      currentCount >= milestone.days &&
      !existingMilestones.includes(milestone.days),
  );
}

async function grantMilestoneRewards(input: {
  actor: AuthUser;
  userId: string;
  universityId: string;
  streakId: string;
  streakType: StreakTypeInput;
  milestones: (typeof STREAK_MILESTONES)[number][];
}) {
  for (const milestone of input.milestones) {
    await awardXpToUser(input.actor, {
      userId: input.userId,
      action: "STREAK_MILESTONE",
      xpAwarded: milestone.xpReward,
      sourceType: "STREAK",
      sourceId: input.streakId,
      idempotencyKey: `streak:${input.streakId}:${milestone.days}`,
      metadata: {
        streakType: input.streakType,
        milestoneDays: milestone.days,
      },
    });

    try {
      await grantBadgeToUser(input.actor, {
        userId: input.userId,
        slug: milestone.badgeSlug,
        source: "STREAK",
        metadata: {
          streakId: input.streakId,
          streakType: input.streakType,
          milestoneDays: milestone.days,
        },
      });
    } catch (error) {
      await writeAuditLog({
        actorId: input.actor.id,
        universityId: input.universityId,
        action: "STREAK_BADGE_GRANT_FAILED",
        entityType: "streak",
        entityId: input.streakId,
        metadata: {
          streakType: input.streakType,
          milestoneDays: milestone.days,
          badgeSlug: milestone.badgeSlug,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    await createSystemNotification({
      target: {
        recipientId: input.userId,
        universityId: input.universityId,
      },
      senderId: input.actor.id,
      type: "BADGE",
      title: "Streak milestone reached",
      message: `You reached a ${milestone.days} day streak.`,
      entityType: "streak",
      entityId: input.streakId,
      priority: "NORMAL",
      channels: { inApp: true, email: false, push: true, sms: false },
      metadata: {
        engagementType: "streak_reminder",
        streakType: input.streakType,
        milestoneDays: milestone.days,
        badgeSlug: milestone.badgeSlug,
        xpReward: milestone.xpReward,
      },
    });

    await createRewardEventForUser(input.actor, {
      userId: input.userId,
      trigger: "MILESTONE_REACHED",
      title: "Streak milestone reached",
      description: `You reached a ${milestone.days} day streak.`,
      reward: {
        type: "STREAK_MILESTONE",
        label: `${milestone.days} day streak`,
        milestoneDays: milestone.days,
      },
      xp: milestone.xpReward,
      badge: {
        slug: milestone.badgeSlug,
      },
      animationType: milestone.days >= 100 ? "FIREWORKS" : "CONFETTI",
      entityType: "streak",
      entityId: input.streakId,
      metadata: {
        streakType: input.streakType,
        milestoneDays: milestone.days,
      },
    });
  }
}

export async function recordStreakActivity(input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = recordStreakActivitySchema.parse(input);
  const userId = payload.userId ?? actor.id;
  const user = await getActiveUserOrThrow(userId);
  const universityId = streakUniversityId(user);
  const canGrantUniversityRewards = hasUniversityScope(user);

  assertCanMutateUserStreak(actor, userId, universityId);

  const activityDate = startOfUtcDay(payload.activityDate ?? new Date());
  const existing = await StreakModel.findOne({
    universityId,
    userId,
    streakType: payload.streakType,
  }).lean();
  const existingMilestones = Array.isArray(existing?.milestonesEarned)
    ? existing.milestonesEarned.map(Number)
    : [];
  const currentCount = Number(existing?.currentCount ?? 0);
  const recoveryTokens = Number(existing?.recoveryTokens ?? 0);
  let nextCurrentCount = 1;
  const nextStatus = "ACTIVE";
  let lastBrokenAt = existing?.lastBrokenAt ?? null;
  let nextRecoveryTokens = recoveryTokens;
  let recoveryCount = Number(existing?.recoveryCount ?? 0);
  let lastRecoveryAt = existing?.lastRecoveryAt ?? null;
  let recovered = false;
  let idempotent = false;

  if (existing?.lastActivityDate instanceof Date) {
    const diff = dayDiff(existing.lastActivityDate, activityDate);

    if (diff < 0) {
      throw forbidden(
        "Cannot record streak activity before the last activity date.",
      );
    }

    if (diff === 0) {
      nextCurrentCount = currentCount;
      idempotent = true;
    } else if (diff === 1) {
      nextCurrentCount = currentCount + 1;
    } else if (diff === 2 && payload.useRecovery && recoveryTokens > 0) {
      nextCurrentCount = currentCount + 1;
      nextRecoveryTokens = recoveryTokens - 1;
      recoveryCount += 1;
      lastRecoveryAt = new Date();
      recovered = true;
    } else {
      nextCurrentCount = 1;
      lastBrokenAt = new Date();
    }
  }

  const longestCount = Math.max(
    Number(existing?.longestCount ?? 0),
    nextCurrentCount,
  );
  const milestones = idempotent
    ? []
    : milestoneRewardsForCount(nextCurrentCount, existingMilestones);
  const milestoneDays = milestones.map((milestone) => milestone.days);
  const milestoneBadges = milestones.map((milestone) => milestone.badgeSlug);
  const streak = await StreakModel.findOneAndUpdate(
    {
      universityId,
      userId,
      streakType: payload.streakType,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId,
        userId,
        streakType: payload.streakType,
      },
      $set: {
        currentCount: nextCurrentCount,
        longestCount,
        lastActivityDate: activityDate,
        lastBrokenAt,
        recoveryTokens: nextRecoveryTokens,
        recoveryCount,
        lastRecoveryAt,
        status: nextStatus,
        metadata: payload.metadata ?? existing?.metadata ?? null,
      },
      ...(milestoneDays.length
        ? {
            $addToSet: {
              milestonesEarned: { $each: milestoneDays },
              milestoneBadgesEarned: { $each: milestoneBadges },
            },
          }
        : {}),
    },
    { new: true, upsert: true },
  ).lean();

  if (streak && milestones.length && canGrantUniversityRewards) {
    await grantMilestoneRewards({
      actor,
      userId,
      universityId,
      streakId: String(streak._id),
      streakType: payload.streakType,
      milestones,
    });
  }

  if (
    streak &&
    !idempotent &&
    payload.streakType === "DAILY_LOGIN" &&
    canGrantUniversityRewards
  ) {
    await awardXpToUser(actor, {
      userId,
      action: "DAILY_LOGIN",
      sourceType: "STREAK",
      sourceId: String(streak._id),
      idempotencyKey: `daily-login:${userId}:${activityDate.toISOString().slice(0, 10)}`,
      metadata: {
        streakId: String(streak._id),
        streakType: payload.streakType,
        activityDate: activityDate.toISOString(),
      },
    });

    try {
      await grantBadgeToUser(actor, {
        userId,
        slug: "first-login",
        source: "DAILY_LOGIN",
        metadata: {
          streakId: String(streak._id),
          activityDate: activityDate.toISOString(),
        },
      });
    } catch (error) {
      await writeAuditLog({
        actorId: actor.id,
        universityId,
        action: "FIRST_LOGIN_BADGE_GRANT_FAILED",
        entityType: "streak",
        entityId: String(streak._id),
        metadata: {
          userId,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  if (streak && recovered && canGrantUniversityRewards) {
    await createRewardEventForUser(actor, {
      userId,
      trigger: "MILESTONE_REACHED",
      title: "Streak Freeze Activated",
      description: "A streak freeze saved your CampusHub streak.",
      reward: {
        type: "STREAK_FREEZE",
        label: "Streak Freeze Activated",
      },
      xp: 0,
      animationType: "SPOTLIGHT",
      entityType: "streak",
      entityId: String(streak._id),
      metadata: {
        streakType: payload.streakType,
        currentCount: nextCurrentCount,
        recoveryTokensRemaining: nextRecoveryTokens,
      },
    });
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: recovered ? "STREAK_RECOVERED" : "STREAK_ACTIVITY_RECORDED",
    entityType: "streak",
    entityId: String(streak?._id),
    after: {
      userId,
      streakType: payload.streakType,
      currentCount: nextCurrentCount,
      longestCount,
      recovered,
      milestones: milestoneDays,
    },
  });

  return {
    streak: serializeStreak(streak as Record<string, unknown>),
    idempotent,
    recovered,
    milestones,
  };
}

export async function listStreaks(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = streakQuerySchema.parse(query);
  const userId = filters.userId ?? actor.id;
  const user = await getActiveUserOrThrow(userId);
  const universityId = streakUniversityId(user);

  assertCanAccessUserStreaks(actor, userId, universityId);

  const dbFilter: Record<string, unknown> = {
    universityId,
    userId,
  };
  if (filters.streakType) dbFilter.streakType = filters.streakType;
  if (filters.status) dbFilter.status = filters.status;

  const streaks = await StreakModel.find(dbFilter)
    .sort({ streakType: 1 })
    .limit(filters.limit)
    .lean();

  return streaks.map((streak) =>
    serializeStreak(streak as Record<string, unknown>),
  );
}

export async function getStreakSummary(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = streakSummaryQuerySchema.parse(query);
  const userId = filters.userId ?? actor.id;
  const user = await getActiveUserOrThrow(userId);
  const universityId = streakUniversityId(user);

  assertCanAccessUserStreaks(actor, userId, universityId);

  const streak = await StreakModel.findOne({
    universityId,
    userId,
    streakType: filters.streakType,
  }).lean();

  return serializeStreakSummary(streak as Record<string, unknown> | null);
}

export async function grantRecoveryTokens(input: unknown) {
  const actor = await requireAuth();
  if (!canManageStreaks(actor)) {
    throw forbidden("Streak management access is required.");
  }

  await connectPostgres();
  const payload = grantRecoveryTokenSchema.parse(input);
  const user = await getActiveUserOrThrow(payload.userId);
  const universityId = streakUniversityId(user);

  if (!isSuperAdmin(actor) && actor.universityId !== universityId) {
    throw forbidden("Cannot grant recovery tokens outside your university.");
  }

  const streak = await StreakModel.findOneAndUpdate(
    {
      universityId,
      userId: payload.userId,
      streakType: payload.streakType,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId,
        userId: payload.userId,
        streakType: payload.streakType,
      },
      $inc: {
        recoveryTokens: payload.amount,
      },
      $set: {
        metadata: payload.metadata ?? null,
      },
    },
    { new: true, upsert: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "STREAK_RECOVERY_TOKEN_GRANTED",
    entityType: "streak",
    entityId: String(streak?._id),
    after: {
      userId: payload.userId,
      streakType: payload.streakType,
      amount: payload.amount,
    },
  });

  return serializeStreak(streak as Record<string, unknown>);
}

export const STREAK_MILESTONE_REWARDS = STREAK_MILESTONES;
