import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  almanacQuerySchema,
  calendarRangeSchema,
  createAlmanacEventSchema,
  currentSemesterQuerySchema,
  sendReminderSchema,
  updateAlmanacEventSchema,
  type AlmanacVisibility,
  type CreateAlmanacEventInput,
  type UpdateAlmanacEventInput,
} from "@/features/almanac/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AlmanacEventModel,
  AlmanacEventViewModel,
  AlmanacReminderEngagementModel,
  CollegeModel,
} from "@/lib/db/models";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeIds(values?: string[] | null) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function isCampusAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles);
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function userRoleVisibility(actor: AuthUser) {
  if (hasRole(actor.role, ["STUDENT"], actor.roles)) return "STUDENTS";
  if (hasRole(actor.role, ["TEACHER"], actor.roles)) return "TEACHERS";
  return null;
}

function serializeAlmanacEvent(event: Record<string, unknown>) {
  return {
    id: String(event._id),
    universityId: String(event.universityId),
    title: String(event.title),
    description: (event.description as string | null) ?? null,
    eventType: String(event.eventType),
    startDate: serializeDate(event.startDate),
    endDate: serializeDate(event.endDate),
    isAllDay: Boolean(event.isAllDay),
    visibility: String(event.visibility),
    collegeIds: Array.isArray(event.collegeIds)
      ? event.collegeIds.map(String)
      : [],
    color: String(event.color ?? "#2563eb"),
    createdBy: String(event.createdBy ?? event.createdById),
    status: String(event.status),
    reminders: Array.isArray(event.reminders) ? event.reminders : [],
    analytics: {
      views: Number(event.views ?? 0),
      uniqueViews: Number(event.uniqueViews ?? 0),
      reminderEngagement: Number(event.reminderEngagement ?? 0),
    },
    academicYear: (event.academicYear as string | null) ?? null,
    semester: (event.semester as string | null) ?? null,
    deletedAt: serializeDate(event.deletedAt),
    createdAt: serializeDate(event.createdAt),
    updatedAt: serializeDate(event.updatedAt),
  };
}

function canViewAlmanacEvent(actor: AuthUser, event: Record<string, unknown>) {
  if (actor.universityId !== event.universityId) return false;
  if (isCampusAdmin(actor)) return true;
  if (event.status !== "ACTIVE" || event.deletedAt) return false;

  switch (event.visibility) {
    case "ALL_USERS":
      return true;
    case "STUDENTS":
    case "TEACHERS":
      return userRoleVisibility(actor) === event.visibility;
    case "SPECIFIC_COLLEGES":
      return (
        Boolean(actor.collegeId) &&
        Array.isArray(event.collegeIds) &&
        event.collegeIds.includes(actor.collegeId)
      );
    default:
      return false;
  }
}

function visibleAlmanacFilter(actor: AuthUser) {
  const clauses: Record<string, unknown>[] = [{ visibility: "ALL_USERS" }];
  const roleVisibility = userRoleVisibility(actor);

  if (roleVisibility) clauses.push({ visibility: roleVisibility });
  if (actor.collegeId) {
    clauses.push({
      visibility: "SPECIFIC_COLLEGES",
      collegeIds: actor.collegeId,
    });
  }

  return {
    universityId: actor.universityId,
    status: "ACTIVE",
    ...deletedFilter,
    $or: clauses,
  };
}

async function assertCollegeScope(universityId: string, collegeIds: string[]) {
  if (!collegeIds.length) return;

  const colleges = await CollegeModel.find({
    _id: { $in: collegeIds },
    universityId,
    ...deletedFilter,
  }).lean();

  if (colleges.length !== collegeIds.length) {
    throw forbidden("One or more colleges do not belong to this university.");
  }
}

function buildReminders(
  startDate: Date,
  reminders: Array<{
    offsetDays?: number;
    remindAt?: Date;
    label?: string | null;
  }>,
) {
  const defaultOffsets = [1, 3, 7];
  const input: Array<{
    offsetDays?: number;
    remindAt?: Date;
    label?: string | null;
  }> =
    reminders.length > 0
      ? reminders
      : defaultOffsets.map((offsetDays) => ({
          offsetDays,
          remindAt: undefined,
          label: null,
        }));

  return input.map((reminder) => {
    const remindAt =
      reminder.remindAt ??
      new Date(startDate.getTime() - (reminder.offsetDays ?? 0) * 86400000);

    return {
      reminderId: randomUUID(),
      offsetDays:
        reminder.offsetDays ??
        Math.max(
          Math.round((startDate.getTime() - remindAt.getTime()) / 86400000),
          0,
        ),
      remindAt,
      label: reminder.label ?? null,
      sentAt: null,
    };
  });
}

async function trackView(actor: AuthUser, event: Record<string, unknown>) {
  const result = await AlmanacEventViewModel.updateOne(
    {
      almanacEventId: event._id,
      userId: actor.id,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: event.universityId,
        almanacEventId: event._id,
        userId: actor.id,
        viewedAt: new Date(),
      },
    },
    { upsert: true },
  );

  await AlmanacEventModel.updateOne({ _id: event._id }, { $inc: { views: 1 } });

  if (result.upsertedCount) {
    const uniqueViews = await AlmanacEventViewModel.countDocuments({
      almanacEventId: event._id,
    });
    await AlmanacEventModel.updateOne(
      { _id: event._id },
      { $set: { uniqueViews } },
    );
  }
}

async function emitReminderNotification(
  actor: AuthUser,
  event: Record<string, unknown>,
) {
  const type =
    event.eventType === "SEMESTER_START"
      ? "ALMANAC_SEMESTER_START_REMINDER"
      : event.eventType === "EXAMINATION"
        ? "ALMANAC_EXAMINATION_REMINDER"
        : event.eventType === "REGISTRATION"
          ? "ALMANAC_REGISTRATION_REMINDER"
          : "ALMANAC_UPCOMING_EVENT_REMINDER";

  await emitNotificationEvent({
    type,
    universityId: String(event.universityId),
    actorId: actor.id,
    entityType: "almanac_event",
    entityId: String(event._id),
    metadata: {
      title: event.title,
      eventType: event.eventType,
      startDate: serializeDate(event.startDate),
    },
  });
}

async function getAlmanacEventForActor(eventId: string, actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const event = await AlmanacEventModel.findOne({
    _id: eventId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!event) throw notFound("Almanac event not found.");

  if (!canViewAlmanacEvent(actor, event as Record<string, unknown>)) {
    throw forbidden("You cannot access this almanac event.");
  }

  return event;
}

function assertCanManage(actor: AuthUser) {
  if (!isCampusAdmin(actor)) {
    throw forbidden("Campus Admin access is required.");
  }
}

export async function createAlmanacEvent(input: CreateAlmanacEventInput) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  assertCanManage(actor);
  await connectMongo();

  const payload = createAlmanacEventSchema.parse(input);
  const collegeIds = normalizeIds(payload.collegeIds);
  await assertCollegeScope(universityId, collegeIds);

  const event = await AlmanacEventModel.create({
    _id: randomUUID(),
    universityId,
    title: payload.title,
    description: payload.description ?? null,
    eventType: payload.eventType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    isAllDay: payload.isAllDay,
    visibility: payload.visibility,
    collegeIds,
    color: payload.color,
    createdBy: actor.id,
    createdById: actor.id,
    status: payload.status,
    academicYear: payload.academicYear ?? null,
    semester: payload.semester ?? null,
    reminders: buildReminders(payload.startDate, payload.reminders),
    appliesTo: {
      universityWide: payload.visibility === "ALL_USERS",
      collegeIds,
      roles: payload.visibility.endsWith("S") ? [payload.visibility] : [],
    },
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ALMANAC_EVENT_CREATED",
    entityType: "almanac_event",
    entityId: String(event._id),
    after: serializeAlmanacEvent(event.toObject()),
  });

  return serializeAlmanacEvent(event.toObject());
}

export async function listAlmanacEvents(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  const filters = almanacQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = isCampusAdmin(actor)
    ? { universityId, ...deletedFilter }
    : visibleAlmanacFilter(actor);

  if (filters.status) dbFilter.status = filters.status;
  else if (isCampusAdmin(actor) && !filters.includeArchived) {
    dbFilter.status = { $ne: "ARCHIVED" };
  }
  if (filters.eventType) dbFilter.eventType = filters.eventType;
  if (filters.from || filters.to) {
    dbFilter.startDate = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }
  if (filters.q) dbFilter.$text = { $search: filters.q };

  const events = await AlmanacEventModel.find(dbFilter)
    .sort({ startDate: 1 })
    .lean();

  return events.map((event) =>
    serializeAlmanacEvent(event as Record<string, unknown>),
  );
}

export async function getAlmanacEvent(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getAlmanacEventForActor(eventId, actor);
  await trackView(actor, event as Record<string, unknown>);
  const refreshed = await AlmanacEventModel.findById(eventId).lean();

  return serializeAlmanacEvent((refreshed ?? event) as Record<string, unknown>);
}

export async function updateAlmanacEvent(
  eventId: string,
  input: UpdateAlmanacEventInput,
) {
  const actor = await requireAuth();
  assertCanManage(actor);
  await connectMongo();

  const payload = updateAlmanacEventSchema.parse(input);
  const before = await getAlmanacEventForActor(eventId, actor);
  const universityId = String(before.universityId);
  const nextCollegeIds = normalizeIds(
    payload.collegeIds ?? (before.collegeIds as string[] | undefined),
  );
  await assertCollegeScope(universityId, nextCollegeIds);

  const update: Record<string, unknown> = {
    updatedById: actor.id,
  };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.description !== undefined)
    update.description = payload.description ?? null;
  if (payload.eventType !== undefined) update.eventType = payload.eventType;
  if (payload.startDate !== undefined) update.startDate = payload.startDate;
  if (payload.endDate !== undefined) update.endDate = payload.endDate;
  if (payload.isAllDay !== undefined) update.isAllDay = payload.isAllDay;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.color !== undefined) update.color = payload.color;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.academicYear !== undefined)
    update.academicYear = payload.academicYear ?? null;
  if (payload.semester !== undefined)
    update.semester = payload.semester ?? null;
  if (payload.collegeIds !== undefined) update.collegeIds = nextCollegeIds;
  if (payload.reminders !== undefined) {
    update.reminders = buildReminders(
      payload.startDate ?? (before.startDate as Date),
      payload.reminders,
    );
  }

  const visibility =
    payload.visibility ?? (before.visibility as AlmanacVisibility);
  update.appliesTo = {
    universityWide: visibility === "ALL_USERS",
    collegeIds: nextCollegeIds,
    roles: visibility.endsWith("S") ? [visibility] : [],
  };

  const event = await AlmanacEventModel.findOneAndUpdate(
    { _id: eventId, universityId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ALMANAC_EVENT_UPDATED",
    entityType: "almanac_event",
    entityId: eventId,
    before: serializeAlmanacEvent(before as Record<string, unknown>),
    after: event
      ? serializeAlmanacEvent(event as Record<string, unknown>)
      : null,
  });

  return serializeAlmanacEvent(event as Record<string, unknown>);
}

export async function archiveAlmanacEvent(eventId: string) {
  return setAlmanacEventStatus(eventId, "ARCHIVED", "ALMANAC_EVENT_ARCHIVED");
}

export async function cancelAlmanacEvent(eventId: string) {
  return setAlmanacEventStatus(eventId, "CANCELLED", "ALMANAC_EVENT_CANCELLED");
}

export async function deleteAlmanacEvent(eventId: string) {
  const actor = await requireAuth();
  assertCanManage(actor);
  await connectMongo();
  const before = await getAlmanacEventForActor(eventId, actor);
  const event = await AlmanacEventModel.findOneAndUpdate(
    { _id: eventId, universityId: actor.universityId, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "ALMANAC_EVENT_DELETED",
    entityType: "almanac_event",
    entityId: eventId,
    before: serializeAlmanacEvent(before as Record<string, unknown>),
    after: event
      ? serializeAlmanacEvent(event as Record<string, unknown>)
      : null,
  });

  return serializeAlmanacEvent(event as Record<string, unknown>);
}

async function setAlmanacEventStatus(
  eventId: string,
  status: "ARCHIVED" | "CANCELLED",
  action: "ALMANAC_EVENT_ARCHIVED" | "ALMANAC_EVENT_CANCELLED",
) {
  const actor = await requireAuth();
  assertCanManage(actor);
  await connectMongo();
  const before = await getAlmanacEventForActor(eventId, actor);
  const event = await AlmanacEventModel.findOneAndUpdate(
    { _id: eventId, universityId: actor.universityId, ...deletedFilter },
    { $set: { status, updatedById: actor.id } },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action,
    entityType: "almanac_event",
    entityId: eventId,
    before: serializeAlmanacEvent(before as Record<string, unknown>),
    after: event
      ? serializeAlmanacEvent(event as Record<string, unknown>)
      : null,
  });

  return serializeAlmanacEvent(event as Record<string, unknown>);
}

export async function getUpcomingAlmanacEvents() {
  return listAlmanacEvents({ from: new Date() });
}

export async function getAlmanacCalendarRange(query: unknown) {
  const range = calendarRangeSchema.parse(query);
  return listAlmanacEvents({ from: range.from, to: range.to });
}

export async function getCurrentSemesterEvents(query: unknown = {}) {
  const { date } = currentSemesterQuerySchema.parse(query);
  const events = await listAlmanacEvents({
    from: new Date(date.getFullYear(), 0, 1),
    to: new Date(date.getFullYear(), 11, 31, 23, 59, 59),
  });
  const currentSemesterStart = events
    .filter((event) => event.eventType === "SEMESTER_START")
    .filter((event) => event.startDate && new Date(event.startDate) <= date)
    .at(-1);
  const currentSemesterEnd = events
    .filter((event) => event.eventType === "SEMESTER_END")
    .find((event) => event.endDate && new Date(event.endDate) >= date);

  if (!currentSemesterStart || !currentSemesterEnd) {
    return events;
  }

  return events.filter((event) => {
    if (!event.startDate) return false;
    const start = new Date(event.startDate);
    return (
      start >= new Date(currentSemesterStart.startDate as string) &&
      start <= new Date(currentSemesterEnd.endDate as string)
    );
  });
}

export async function sendAlmanacReminder(
  eventId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  assertCanManage(actor);
  await connectMongo();
  const payload = sendReminderSchema.parse(input);
  const event = await getAlmanacEventForActor(eventId, actor);
  const reminders = Array.isArray(event.reminders) ? event.reminders : [];
  const reminder =
    reminders.find(
      (item: { reminderId?: string }) => item.reminderId === payload.reminderId,
    ) ?? reminders[0];

  if (!reminder) {
    throw notFound("Reminder not found.");
  }

  await emitReminderNotification(actor, event as Record<string, unknown>);
  await AlmanacEventModel.updateOne(
    { _id: eventId, "reminders.reminderId": reminder.reminderId },
    { $set: { "reminders.$.sentAt": new Date(), updatedById: actor.id } },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action: "ALMANAC_REMINDER_SENT",
    entityType: "almanac_event",
    entityId: eventId,
    metadata: {
      reminderId: reminder.reminderId,
    },
  });

  const refreshed = await AlmanacEventModel.findById(eventId).lean();
  return serializeAlmanacEvent((refreshed ?? event) as Record<string, unknown>);
}

export async function engageAlmanacReminder(
  eventId: string,
  reminderId: string,
) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getAlmanacEventForActor(eventId, actor);
  const result = await AlmanacReminderEngagementModel.updateOne(
    {
      almanacEventId: eventId,
      userId: actor.id,
      reminderId,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: event.universityId,
        almanacEventId: eventId,
        userId: actor.id,
        reminderId,
        engagedAt: new Date(),
      },
    },
    { upsert: true },
  );

  if (result.upsertedCount) {
    const reminderEngagement =
      await AlmanacReminderEngagementModel.countDocuments({
        almanacEventId: eventId,
      });
    await AlmanacEventModel.updateOne(
      { _id: eventId },
      { $set: { reminderEngagement } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action: "ALMANAC_REMINDER_ENGAGED",
    entityType: "almanac_event",
    entityId: eventId,
    metadata: { reminderId },
  });

  const refreshed = await AlmanacEventModel.findById(eventId).lean();
  return serializeAlmanacEvent((refreshed ?? event) as Record<string, unknown>);
}
