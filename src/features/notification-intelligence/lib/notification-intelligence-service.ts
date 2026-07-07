import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  notificationIntelligenceDispatchSchema,
  notificationIntelligenceSummaryQuerySchema,
  type NotificationIntelligenceType,
} from "@/features/notification-intelligence/lib/notification-intelligence-schemas";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import type { CreateNotificationInput } from "@/features/notifications/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { NotificationModel, UserModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function canManageNotificationIntelligence(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.NOTIFICATION_MANAGE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot manage another university's notifications.");
  }

  return actor.universityId;
}

function notificationTypeForIntelligence(type: NotificationIntelligenceType) {
  const mapping = {
    RECOMMENDATIONS: "RECOMMENDATION",
    MARKETPLACE: "MARKETPLACE",
    PROJECTS: "PROJECT",
    COMMUNITIES: "COMMUNITY",
    EVENTS: "EVENT",
    MENTORSHIP: "MENTORSHIP",
    EMPLOYERS: "EMPLOYER",
    GOVERNANCE: "GOVERNANCE",
  } as const;

  return mapping[type];
}

function defaultPriorityForIntelligence(type: NotificationIntelligenceType) {
  if (type === "GOVERNANCE") return "HIGH";
  if (type === "MENTORSHIP") return "HIGH";
  if (type === "EVENTS") return "NORMAL";
  if (type === "MARKETPLACE") return "NORMAL";
  if (type === "EMPLOYERS") return "NORMAL";
  if (type === "PROJECTS") return "NORMAL";
  if (type === "COMMUNITIES") return "LOW";

  return "LOW";
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
}

function intelligenceDedupeKey(input: {
  type: NotificationIntelligenceType;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  dedupeKey?: string;
}) {
  if (input.dedupeKey) return input.dedupeKey;

  return [
    input.type,
    input.entityType ?? "notification",
    input.entityId ?? "broadcast",
    input.title.toLowerCase(),
  ].join(":");
}

async function resolveRecipients(input: {
  actor: AuthUser;
  target: CreateNotificationInput["target"];
  universityId: string | null;
}) {
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

  if (input.universityId) userFilter.universityId = input.universityId;
  if (or.length) userFilter.$or = or;

  const users = await UserModel.find(userFilter)
    .select("_id universityId")
    .lean();

  if (hasRole(input.actor.role, ["SUPER_ADMIN"], input.actor.roles)) {
    return users.map((user) => ({
      id: String(user._id),
      universityId:
        typeof user.universityId === "string" ? user.universityId : null,
    }));
  }

  return users
    .filter((user) => user.universityId === input.actor.universityId)
    .map((user) => ({
      id: String(user._id),
      universityId:
        typeof user.universityId === "string" ? user.universityId : null,
    }));
}

async function suppressDuplicateRecipients(input: {
  recipientIds: string[];
  dedupeKey: string;
  windowMinutes: number;
}) {
  if (!input.recipientIds.length) return new Set<string>();
  const since = new Date(Date.now() - input.windowMinutes * 60_000);
  const existing = await NotificationModel.find({
    recipientId: { $in: input.recipientIds },
    "metadata.intelligence.dedupeKey": input.dedupeKey,
    createdAt: { $gte: since },
    deletedAt: null,
  })
    .select("recipientId")
    .lean();

  return new Set(existing.map((notification) => String(notification.recipientId)));
}

function normalizeCounts(rows: Array<{ _id: unknown; count: number }>, key: string) {
  return rows.map((row) => ({
    [key]: String(row._id ?? "UNKNOWN"),
    count: Number(row.count ?? 0),
  }));
}

export async function dispatchIntelligentNotification(input: unknown) {
  const actor = await requireAuth();
  if (!canManageNotificationIntelligence(actor)) {
    throw forbidden("Notification intelligence management access is required.");
  }

  await connectPostgres();
  const payload = notificationIntelligenceDispatchSchema.parse(input);
  const targetUniversityId = scopedUniversityId(
    actor,
    payload.target.universityId,
  );
  const recipients = await resolveRecipients({
    actor,
    target: payload.target,
    universityId: targetUniversityId,
  });
  const recipientIds = recipients.map((recipient) => recipient.id);
  const dedupeKey = intelligenceDedupeKey(payload);
  const duplicateRecipients = await suppressDuplicateRecipients({
    recipientIds,
    dedupeKey,
    windowMinutes: payload.dedupeWindowMinutes,
  });
  const eligibleRecipientIds = recipientIds.filter(
    (recipientId) => !duplicateRecipients.has(recipientId),
  );

  if (!eligibleRecipientIds.length) {
    await writeAuditLog({
      actorId: actor.id,
      universityId: targetUniversityId,
      action: "NOTIFICATION_INTELLIGENCE_DISPATCHED",
      entityType: "notification_intelligence",
      entityId: payload.entityId ?? null,
      metadata: {
        intelligenceType: payload.type,
        recipientCount: 0,
        suppressedCount: duplicateRecipients.size,
        dedupeKey,
      },
    });

    return {
      created: 0,
      suppressed: duplicateRecipients.size,
      dedupeKey,
      notifications: [],
    };
  }

  const notificationPayload: CreateNotificationInput = {
    target: {
      recipientIds: eligibleRecipientIds,
      universityId: targetUniversityId ?? undefined,
      recipientId: undefined,
      roles: [],
      collegeIds: [],
      departmentIds: [],
      customAudience: [],
    },
    senderId: payload.senderId ?? actor.id,
    type: notificationTypeForIntelligence(payload.type),
    title: payload.title,
    message: payload.message,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    actionUrl: payload.actionUrl ?? null,
    image: payload.image ?? null,
    priority: payload.priority ?? defaultPriorityForIntelligence(payload.type),
    channels: payload.channels,
    expiresAt: payload.expiresAt ?? null,
    metadata: {
      ...(payload.metadata ?? {}),
      intelligence: {
        enabled: true,
        type: payload.type,
        dedupeKey,
        dedupeWindowMinutes: payload.dedupeWindowMinutes,
        generatedBy: "RULE_BASED_NOTIFICATION_INTELLIGENCE",
      },
    },
  };

  const result = await createSystemNotification(notificationPayload);

  await writeAuditLog({
    actorId: actor.id,
    universityId: targetUniversityId,
    action: "NOTIFICATION_INTELLIGENCE_DISPATCHED",
    entityType: "notification_intelligence",
    entityId: payload.entityId ?? null,
    metadata: {
      intelligenceType: payload.type,
      notificationType: notificationPayload.type,
      recipientCount: result.created,
      suppressedCount: duplicateRecipients.size,
      dedupeKey,
      target: payload.target,
    },
  });

  return {
    created: result.created,
    suppressed: duplicateRecipients.size,
    dedupeKey,
    notifications: result.notifications,
  };
}

export async function getNotificationIntelligenceSummary(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canManageNotificationIntelligence(actor)) {
    throw forbidden("Notification intelligence access is required.");
  }

  await connectPostgres();
  const filters = notificationIntelligenceSummaryQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  const createdAt = dateRange(filters.from, filters.to);
  const dbFilter: Record<string, unknown> = {
    "metadata.intelligence.enabled": true,
    deletedAt: null,
  };
  if (universityId) dbFilter.universityId = universityId;
  if (createdAt) dbFilter.createdAt = createdAt;

  const [
    total,
    unread,
    archived,
    byIntelligenceType,
    byNotificationType,
    byPriority,
    byStatus,
  ] = await Promise.all([
    NotificationModel.countDocuments(dbFilter),
    NotificationModel.countDocuments({ ...dbFilter, status: "UNREAD" }),
    NotificationModel.countDocuments({ ...dbFilter, status: "ARCHIVED" }),
    NotificationModel.aggregate([
      { $match: dbFilter },
      { $group: { _id: "$metadata.intelligence.type", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
    NotificationModel.aggregate([
      { $match: dbFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
    NotificationModel.aggregate([
      { $match: dbFilter },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
    NotificationModel.aggregate([
      { $match: dbFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 as const } },
    ]),
  ]);

  return {
    filters: {
      universityId: universityId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
    },
    totals: {
      total,
      unread,
      archived,
      read: Math.max(total - unread - archived, 0),
    },
    breakdowns: {
      byIntelligenceType: normalizeCounts(byIntelligenceType, "type"),
      byNotificationType: normalizeCounts(byNotificationType, "type"),
      byPriority: normalizeCounts(byPriority, "priority"),
      byStatus: normalizeCounts(byStatus, "status"),
    },
  };
}
