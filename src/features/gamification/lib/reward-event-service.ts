import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  createRewardEventSchema,
  rewardEventQuerySchema,
  updateRewardEventStatusSchema,
} from "@/features/gamification/lib/reward-event-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { RewardEventModel, UserModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageRewardEvents(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.BADGE_MANAGE)
  );
}

function serializeRewardEvent(event: Record<string, unknown>) {
  return {
    id: String(event._id),
    universityId: String(event.universityId),
    userId: String(event.userId),
    trigger: String(event.trigger),
    title: String(event.title),
    description: typeof event.description === "string" ? event.description : null,
    reward: event.reward ?? null,
    xp: Number(event.xp ?? 0),
    badge: event.badge ?? null,
    animationType: String(event.animationType ?? "CONFETTI"),
    entityType: typeof event.entityType === "string" ? event.entityType : null,
    entityId: typeof event.entityId === "string" ? event.entityId : null,
    status: String(event.status ?? "UNSEEN"),
    seenAt: serializeDate(event.seenAt),
    archivedAt: serializeDate(event.archivedAt),
    metadata: event.metadata ?? null,
    createdAt: serializeDate(event.createdAt),
    updatedAt: serializeDate(event.updatedAt),
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
  };
}

function assertCanTargetUser(actor: AuthUser, userId: string, universityId: string) {
  if (actor.id === userId) return;
  if (isSuperAdmin(actor)) return;
  if (
    hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles) &&
    actor.universityId === universityId
  ) {
    return;
  }

  throw forbidden("Cannot access another user's reward events.");
}

export async function createRewardEventForUser(
  actor: AuthUser,
  input: unknown,
) {
  await connectPostgres();
  const payload = createRewardEventSchema.parse(input);
  const user = await getActiveUserOrThrow(payload.userId);

  if (!isSuperAdmin(actor) && actor.universityId !== user.universityId) {
    throw forbidden("Cannot create reward events outside your university.");
  }

  const event = await RewardEventModel.create({
    _id: randomUUID(),
    universityId: payload.universityId ?? user.universityId,
    userId: payload.userId,
    trigger: payload.trigger,
    title: payload.title,
    description: payload.description ?? null,
    reward: payload.reward ?? null,
    xp: payload.xp,
    badge: payload.badge ?? null,
    animationType: payload.animationType,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    status: "UNSEEN",
    metadata: payload.metadata ?? null,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: payload.universityId ?? user.universityId,
    action: "REWARD_EVENT_CREATED",
    entityType: "reward_event",
    entityId: String(event._id),
    after: {
      userId: payload.userId,
      trigger: payload.trigger,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
    },
  });

  return serializeRewardEvent(event.toObject());
}

export async function createRewardEvent(input: unknown) {
  const actor = await requireAuth();
  if (!canManageRewardEvents(actor)) {
    throw forbidden("Reward event management access is required.");
  }

  return createRewardEventForUser(actor, input);
}

export async function listRewardEvents(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = rewardEventQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    userId: actor.id,
  };

  if (filters.status) dbFilter.status = filters.status;
  else if (!filters.includeArchived) dbFilter.status = { $ne: "ARCHIVED" };
  if (filters.trigger) dbFilter.trigger = filters.trigger;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const events = await RewardEventModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return events.map((event) =>
    serializeRewardEvent(event as Record<string, unknown>),
  );
}

export async function getUnseenRewardEventCount() {
  const actor = await requireAuth();
  await connectPostgres();
  const count = await RewardEventModel.countDocuments({
    userId: actor.id,
    status: "UNSEEN",
  });

  return { count };
}

export async function updateRewardEventStatus(
  rewardEventId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = updateRewardEventStatusSchema.parse(input);
  const event = await RewardEventModel.findById(rewardEventId).lean();

  if (!event) throw notFound("Reward event not found.");

  assertCanTargetUser(actor, String(event.userId), String(event.universityId));

  const now = new Date();
  const updated = await RewardEventModel.findOneAndUpdate(
    { _id: rewardEventId },
    {
      $set: {
        status: payload.status,
        seenAt:
          payload.status === "SEEN" || payload.status === "ARCHIVED"
            ? (event.seenAt ?? now)
            : event.seenAt,
        archivedAt: payload.status === "ARCHIVED" ? now : event.archivedAt,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action:
      payload.status === "ARCHIVED"
        ? "REWARD_EVENT_ARCHIVED"
        : "REWARD_EVENT_SEEN",
    entityType: "reward_event",
    entityId: rewardEventId,
    before: {
      status: String(event.status ?? "UNSEEN"),
    },
    after: {
      status: payload.status,
    },
  });

  return serializeRewardEvent(updated as Record<string, unknown>);
}

export async function markAllRewardEventsSeen() {
  const actor = await requireAuth();
  await connectPostgres();
  const now = new Date();
  const result = await RewardEventModel.updateMany(
    {
      userId: actor.id,
      status: "UNSEEN",
    },
    {
      $set: {
        status: "SEEN",
        seenAt: now,
      },
    },
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId ?? null,
    action: "REWARD_EVENT_SEEN",
    entityType: "reward_event",
    entityId: null,
    metadata: {
      count: result.modifiedCount,
      bulk: true,
    },
  });

  return { updated: result.modifiedCount };
}
