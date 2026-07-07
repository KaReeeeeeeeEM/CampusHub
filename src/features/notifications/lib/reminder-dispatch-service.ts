import { hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AlmanacEventModel,
  AnnouncementModel,
  EventModel,
  NotificationModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };
const dayMs = 24 * 60 * 60 * 1000;
const eventReminderWindows = [
  { label: "24h", offsetMs: dayMs, minMsBeforeStart: 2 * 60 * 60 * 1000 },
  { label: "1h", offsetMs: 60 * 60 * 1000, minMsBeforeStart: 0 },
] as const;

type ReminderTarget = {
  universityId?: string;
  roles?: Array<"STUDENT" | "TEACHER" | "ALUMNI" | "EMPLOYER">;
  collegeIds?: string[];
  departmentIds?: string[];
};

function requireDispatchScope(actor: AuthUser, universityId?: string | null) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return universityId ?? actor.universityId ?? null;
  }

  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  if (universityId && universityId !== actor.universityId) {
    throw forbidden("Cannot dispatch reminders for another university.");
  }

  return actor.universityId;
}

function roleForVisibility(visibility: unknown) {
  switch (visibility) {
    case "STUDENTS":
      return "STUDENT";
    case "TEACHERS":
      return "TEACHER";
    case "ALUMNI":
      return "ALUMNI";
    case "EMPLOYERS":
      return "EMPLOYER";
    default:
      return null;
  }
}

function targetForAudience(item: Record<string, unknown>): ReminderTarget {
  const visibility = item.visibility;
  const role = roleForVisibility(visibility);
  const collegeIds = Array.isArray(item.collegeIds)
    ? item.collegeIds.filter((id): id is string => typeof id === "string")
    : [];
  const departmentIds = Array.isArray(item.departmentIds)
    ? item.departmentIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    universityId:
      typeof item.universityId === "string" ? item.universityId : undefined,
    ...(role ? { roles: [role] } : {}),
    ...(visibility === "SPECIFIC_COLLEGES" && collegeIds.length
      ? { collegeIds }
      : {}),
    ...(visibility === "SPECIFIC_DEPARTMENTS" && departmentIds.length
      ? { departmentIds }
      : {}),
  };
}

function formatReminderDate(value: unknown) {
  if (!(value instanceof Date)) return "soon";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

async function hasEntityNotification(
  type: "ANNOUNCEMENT" | "EVENT_REMINDER",
  entityType: string,
  entityId: string,
) {
  return NotificationModel.exists({
    type,
    entityType,
    entityId,
    deletedAt: null,
  });
}

async function dispatchAlmanacReminders(universityId: string | null) {
  const now = new Date();
  const filter: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
    reminders: {
      $elemMatch: {
        remindAt: { $lte: now },
        sentAt: null,
      },
    },
  };

  if (universityId) filter.universityId = universityId;

  const events = await AlmanacEventModel.find(filter).limit(100).lean();
  let created = 0;

  for (const event of events) {
    const eventId = String(event._id);
    const reminders = Array.isArray(event.reminders) ? event.reminders : [];
    const dueReminders = reminders.filter(
      (reminder: { reminderId?: string; remindAt?: Date; sentAt?: Date | null }) =>
        reminder.reminderId &&
        reminder.remindAt instanceof Date &&
        reminder.remindAt <= now &&
        !reminder.sentAt,
    );

    for (const reminder of dueReminders) {
      const idempotencyKey = `almanac:${eventId}:${reminder.reminderId}`;
      const result = await createSystemNotification({
        target: targetForAudience(event as Record<string, unknown>),
        senderId: typeof event.createdBy === "string" ? event.createdBy : null,
        type: "ALMANAC_REMINDER",
        title: `Almanac reminder: ${String(event.title)}`,
        message: `${String(event.title)} is scheduled for ${formatReminderDate(event.startDate)}.`,
        entityType: "almanac_event",
        entityId: eventId,
        priority: event.eventType === "EXAMINATION" ? "HIGH" : "NORMAL",
        channels: { inApp: true, email: false, push: true, sms: false },
        metadata: {
          engagementType: "almanac_reminder",
          idempotencyKey,
          reminderId: reminder.reminderId,
          reminderType: "ALMANAC",
          eventType: event.eventType,
          startDate:
            event.startDate instanceof Date ? event.startDate.toISOString() : null,
        },
      });

      created += result.created;

      await AlmanacEventModel.updateOne(
        { _id: eventId, "reminders.reminderId": reminder.reminderId },
        { $set: { "reminders.$.sentAt": now } },
      );
    }
  }

  return created;
}

async function dispatchEventReminders(universityId: string | null) {
  const now = new Date();
  const horizon = new Date(now.getTime() + dayMs);
  const filter: Record<string, unknown> = {
    status: { $in: ["OPEN", "FULL", "ONGOING"] },
    startDate: { $gte: now, $lte: horizon },
    ...deletedFilter,
  };

  if (universityId) filter.universityId = universityId;

  const events = await EventModel.find(filter).limit(100).lean();
  let created = 0;

  for (const event of events) {
    const startDate = event.startDate;
    if (!(startDate instanceof Date)) continue;

    const msUntilStart = startDate.getTime() - now.getTime();
    const window = eventReminderWindows.find(
      (item) =>
        msUntilStart <= item.offsetMs &&
        msUntilStart >= item.minMsBeforeStart,
    );

    if (!window) continue;

    const eventId = String(event._id);
    const idempotencyKey = `event:${eventId}:${window.label}`;
    const result = await createSystemNotification({
      target: targetForAudience(event as Record<string, unknown>),
      senderId: typeof event.organizerId === "string" ? event.organizerId : null,
      type: "EVENT_REMINDER",
      title: `Event reminder: ${String(event.title)}`,
      message: `${String(event.title)} starts ${formatReminderDate(startDate)} at ${String(event.venue ?? "the selected venue")}.`,
      entityType: "event",
      entityId: eventId,
      priority: window.label === "1h" ? "HIGH" : "NORMAL",
      channels: { inApp: true, email: false, push: true, sms: false },
      metadata: {
        engagementType: "event",
        idempotencyKey,
        reminderType: "EVENT",
        reminderWindow: window.label,
        eventType: event.eventType,
        startDate: startDate.toISOString(),
      },
    });

    created += result.created;
  }

  return created;
}

async function dispatchPublishedAnnouncementNotifications(
  universityId: string | null,
) {
  const now = new Date();
  const since = new Date(now.getTime() - dayMs);
  const filter: Record<string, unknown> = {
    status: "PUBLISHED",
    publishedAt: { $gte: since, $lte: now },
    ...deletedFilter,
  };

  if (universityId) filter.universityId = universityId;

  const announcements = await AnnouncementModel.find(filter).limit(100).lean();
  let created = 0;

  for (const announcement of announcements) {
    const announcementId = String(announcement._id);
    const alreadySent = await hasEntityNotification(
      "ANNOUNCEMENT",
      "announcement",
      announcementId,
    );

    if (alreadySent) continue;

    const result = await createSystemNotification({
      target: targetForAudience(announcement as Record<string, unknown>),
      senderId:
        typeof announcement.createdBy === "string"
          ? announcement.createdBy
          : null,
      type: "ANNOUNCEMENT",
      title: String(announcement.title),
      message:
        typeof announcement.summary === "string" && announcement.summary
          ? announcement.summary
          : "A new announcement has been published.",
      entityType: "announcement",
      entityId: announcementId,
      priority:
        announcement.priority === "URGENT"
          ? "URGENT"
          : announcement.priority === "HIGH"
            ? "HIGH"
            : "NORMAL",
      channels: { inApp: true, email: false, push: true, sms: false },
      metadata: {
        engagementType: "announcement",
        idempotencyKey: `announcement:${announcementId}:published`,
        reminderType: "ANNOUNCEMENT",
        category: announcement.category,
        publishedAt:
          announcement.publishedAt instanceof Date
            ? announcement.publishedAt.toISOString()
            : null,
      },
    });

    created += result.created;
  }

  return created;
}

export async function dispatchDueNotificationReminders(
  input: { universityId?: string | null } = {},
) {
  const actor = await requireAuth();
  const universityId = requireDispatchScope(actor, input.universityId);

  await connectPostgres();

  const [almanac, events, announcements] = await Promise.all([
    dispatchAlmanacReminders(universityId),
    dispatchEventReminders(universityId),
    dispatchPublishedAnnouncementNotifications(universityId),
  ]);

  return {
    created: almanac + events + announcements,
    almanac,
    events,
    announcements,
  };
}
