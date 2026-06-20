import { randomUUID } from "node:crypto";

import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  createNotificationSchema,
  markNotificationReadSchema,
  notificationQuerySchema,
  type CreateNotificationInput,
} from "@/features/notifications/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { NotificationModel, UserModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function notificationCategory(type: string) {
  switch (type) {
    case "RECOMMENDATION":
      return "RECOMMENDATION";
    case "PROJECT":
    case "PROJECT_STAR":
    case "PROJECT_COMMENT":
      return "SHOWCASE";
    case "COMMUNITY":
      return "COMMUNITY";
    case "BADGE":
    case "XP":
      return "GAMIFICATION";
    case "EVENT_REMINDER":
      return "EVENT";
    case "ORDER":
      return "MARKETPLACE";
    case "SUGGESTION":
      return "MODERATION";
    case "EMPLOYER":
      return "EMPLOYER";
    case "GOVERNANCE":
      return "GOVERNANCE";
    default:
      return type;
  }
}

function serializeNotification(notification: Record<string, unknown>) {
  return {
    id: String(notification._id),
    universityId:
      typeof notification.universityId === "string"
        ? notification.universityId
        : null,
    recipientId: String(notification.recipientId),
    senderId:
      typeof notification.senderId === "string"
        ? notification.senderId
        : typeof notification.actorId === "string"
          ? notification.actorId
          : null,
    type: String(notification.type),
    title: String(notification.title),
    message: String(notification.message ?? notification.body ?? ""),
    entityType:
      typeof notification.entityType === "string"
        ? notification.entityType
        : null,
    entityId:
      typeof notification.entityId === "string" ? notification.entityId : null,
    actionUrl:
      typeof notification.actionUrl === "string"
        ? notification.actionUrl
        : null,
    image: typeof notification.image === "string" ? notification.image : null,
    priority: String(notification.priority ?? "NORMAL"),
    status: String(
      notification.status ?? (notification.readAt ? "READ" : "UNREAD"),
    ),
    channels: notification.channels ?? {
      inApp: true,
      email: false,
      push: false,
      sms: false,
    },
    metadata: notification.metadata ?? null,
    createdAt: serializeDate(notification.createdAt),
    readAt: serializeDate(notification.readAt),
    archivedAt: serializeDate(notification.archivedAt),
  };
}

function assertCanManageNotifications(actor: AuthUser) {
  if (
    !hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) &&
    !hasPermission(actor, "NOTIFICATION_MANAGE")
  ) {
    throw forbidden("Notification management access is required.");
  }
}

function scopedUniversityId(actor: AuthUser, requestedUniversityId?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requestedUniversityId ?? actor.universityId ?? null;
  }

  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden("Cannot target another university.");
  }

  return actor.universityId;
}

async function resolveTargetRecipients(
  actor: AuthUser,
  input: CreateNotificationInput,
) {
  const targetUniversityId = scopedUniversityId(
    actor,
    input.target.universityId,
  );
  const explicitRecipientIds = [
    input.target.recipientId,
    ...input.target.recipientIds,
    ...input.target.customAudience,
  ].filter(Boolean) as string[];
  const userFilter: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
  };
  const or: Record<string, unknown>[] = [];

  if (explicitRecipientIds.length) {
    or.push({ _id: { $in: Array.from(new Set(explicitRecipientIds)) } });
  }

  if (input.target.roles.length) {
    or.push({
      $or: [
        { role: { $in: input.target.roles } },
        { roles: { $in: input.target.roles } },
      ],
    });
  }

  if (input.target.collegeIds.length) {
    or.push({ collegeId: { $in: input.target.collegeIds } });
  }

  if (input.target.departmentIds.length) {
    or.push({ departmentId: { $in: input.target.departmentIds } });
  }

  if (
    targetUniversityId &&
    (input.target.universityId ||
      input.target.roles.length ||
      input.target.collegeIds.length ||
      input.target.departmentIds.length)
  ) {
    userFilter.universityId = targetUniversityId;
  }

  if (or.length) userFilter.$or = or;
  else if (targetUniversityId) userFilter.universityId = targetUniversityId;

  const users = await UserModel.find(userFilter)
    .select("_id universityId")
    .lean();

  if (!hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return users.filter((user) => user.universityId === actor.universityId);
  }

  return users;
}

async function resolveSystemTargetRecipients(input: CreateNotificationInput) {
  const explicitRecipientIds = [
    input.target.recipientId,
    ...input.target.recipientIds,
    ...input.target.customAudience,
  ].filter(Boolean) as string[];
  const userFilter: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
  };
  const or: Record<string, unknown>[] = [];

  if (explicitRecipientIds.length) {
    or.push({ _id: { $in: Array.from(new Set(explicitRecipientIds)) } });
  }

  if (input.target.roles.length) {
    or.push({
      $or: [
        { role: { $in: input.target.roles } },
        { roles: { $in: input.target.roles } },
      ],
    });
  }

  if (input.target.collegeIds.length) {
    or.push({ collegeId: { $in: input.target.collegeIds } });
  }

  if (input.target.departmentIds.length) {
    or.push({ departmentId: { $in: input.target.departmentIds } });
  }

  if (input.target.universityId) {
    userFilter.universityId = input.target.universityId;
  }
  if (or.length) userFilter.$or = or;

  return UserModel.find(userFilter).select("_id universityId").lean();
}

async function insertNotificationRecords(
  payload: CreateNotificationInput,
  users: Array<{ _id: unknown; universityId?: unknown }>,
  senderId: string | null,
) {
  const now = new Date();
  const notifications = users.map((user) => ({
    _id: randomUUID(),
    universityId:
      typeof user.universityId === "string"
        ? user.universityId
        : (payload.target.universityId ?? null),
    recipientId: String(user._id),
    actorId: senderId,
    senderId,
    category: notificationCategory(payload.type),
    type: payload.type,
    title: payload.title,
    body: payload.message,
    message: payload.message,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    actionUrl: payload.actionUrl ?? null,
    image: payload.image ?? null,
    priority: payload.priority,
    status: "UNREAD",
    channels: payload.channels,
    deliveredAt: payload.channels.inApp ? now : null,
    expiresAt: payload.expiresAt ?? null,
    metadata: payload.metadata ?? null,
  }));

  if (!notifications.length) return notifications;

  await NotificationModel.insertMany(notifications, { ordered: false });

  return notifications;
}

export async function createNotification(input: unknown) {
  const actor = await requireAuth();
  assertCanManageNotifications(actor);
  await connectMongo();
  const payload = createNotificationSchema.parse(input);
  const users = await resolveTargetRecipients(actor, payload);
  const senderId = payload.senderId ?? actor.id;

  if (!users.length) {
    return {
      created: 0,
      notifications: [],
    };
  }

  const notifications = await insertNotificationRecords(
    payload,
    users,
    senderId,
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: scopedUniversityId(actor, payload.target.universityId),
    action: "NOTIFICATION_SENT",
    entityType: "notification",
    entityId: payload.entityId ?? null,
    metadata: {
      type: payload.type,
      recipientCount: notifications.length,
      target: payload.target,
      channels: payload.channels,
    },
  });

  return {
    created: notifications.length,
    notifications: notifications.map(serializeNotification),
  };
}

export async function createSystemNotification(input: unknown) {
  await connectMongo();
  const payload = createNotificationSchema.parse(input);
  const users = await resolveSystemTargetRecipients(payload);
  const notifications = await insertNotificationRecords(
    payload,
    users,
    payload.senderId ?? null,
  );

  if (notifications.length) {
    await writeAuditLog({
      actorId: payload.senderId ?? null,
      universityId: payload.target.universityId ?? null,
      action: "NOTIFICATION_SENT",
      entityType: "notification",
      entityId: payload.entityId ?? null,
      metadata: {
        type: payload.type,
        recipientCount: notifications.length,
        target: payload.target,
        channels: payload.channels,
        systemGenerated: true,
      },
    });
  }

  return {
    created: notifications.length,
    notifications: notifications.map(serializeNotification),
  };
}

export async function listNotifications(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = notificationQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    recipientId: actor.id,
    ...deletedFilter,
  };

  if (filters.status) dbFilter.status = filters.status;
  else if (!filters.includeArchived) dbFilter.status = { $ne: "ARCHIVED" };
  if (filters.type) dbFilter.type = filters.type;
  if (filters.priority) dbFilter.priority = filters.priority;
  if (filters.entityType) dbFilter.entityType = filters.entityType;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const notifications = await NotificationModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return notifications.map((notification) =>
    serializeNotification(notification as Record<string, unknown>),
  );
}

export async function getUnreadNotificationCount() {
  const actor = await requireAuth();
  await connectMongo();
  const count = await NotificationModel.countDocuments({
    recipientId: actor.id,
    status: "UNREAD",
    ...deletedFilter,
  });

  return { count };
}

async function getOwnedNotification(notificationId: string, actor: AuthUser) {
  const notification = await NotificationModel.findOne({
    _id: notificationId,
    recipientId: actor.id,
    ...deletedFilter,
  }).lean();

  if (!notification) throw notFound("Notification not found.");

  return notification;
}

export async function markNotificationRead(
  notificationId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = markNotificationReadSchema.parse(input);
  await getOwnedNotification(notificationId, actor);
  const readAt = payload.read ? new Date() : null;
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, recipientId: actor.id, ...deletedFilter },
    {
      $set: {
        status: payload.read ? "READ" : "UNREAD",
        readAt,
      },
    },
    { new: true },
  ).lean();

  if (payload.read) {
    await writeAuditLog({
      actorId: actor.id,
      universityId: actor.universityId ?? null,
      action: "NOTIFICATION_READ",
      entityType: "notification",
      entityId: notificationId,
    });
  }

  return serializeNotification(notification as Record<string, unknown>);
}

export async function markAllNotificationsRead() {
  const actor = await requireAuth();
  await connectMongo();
  const readAt = new Date();
  const result = await NotificationModel.updateMany(
    {
      recipientId: actor.id,
      status: "UNREAD",
      ...deletedFilter,
    },
    {
      $set: {
        status: "READ",
        readAt,
      },
    },
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId ?? null,
    action: "NOTIFICATION_READ",
    entityType: "notification",
    entityId: null,
    metadata: {
      count: result.modifiedCount,
      scope: "ALL_UNREAD",
    },
  });

  return { updated: result.modifiedCount };
}

export async function archiveNotification(notificationId: string) {
  const actor = await requireAuth();
  await connectMongo();
  await getOwnedNotification(notificationId, actor);
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, recipientId: actor.id, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId ?? null,
    action: "NOTIFICATION_ARCHIVED",
    entityType: "notification",
    entityId: notificationId,
  });

  return serializeNotification(notification as Record<string, unknown>);
}

export async function deleteNotification(notificationId: string) {
  const actor = await requireAuth();
  await connectMongo();
  await getOwnedNotification(notificationId, actor);
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, recipientId: actor.id, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        deletedAt: new Date(),
        deletedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId ?? null,
    action: "NOTIFICATION_ARCHIVED",
    entityType: "notification",
    entityId: notificationId,
    metadata: {
      deleted: true,
    },
  });

  return serializeNotification(notification as Record<string, unknown>);
}
