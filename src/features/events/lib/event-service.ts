import { randomBytes, randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  createEventSchema,
  eventQuerySchema,
  qrValidationSchema,
  updateEventSchema,
  type CreateEventInput,
  type EventVisibility,
  type UpdateEventInput,
} from "@/features/events/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { requireAuth } from "@/lib/auth/session";
import { forbidden, notFound } from "@/lib/api/response";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CollegeModel,
  DepartmentModel,
  EventAttendanceModel,
  EventModel,
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

function generateQrCode() {
  return `event_${randomBytes(32).toString("base64url")}`;
}

function isCampusAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles);
}

function isRepresentative(actor: AuthUser) {
  return (
    actor.position === "REPRESENTATIVE" ||
    actor.studentLeadershipPositions?.includes("REPRESENTATIVE") ||
    actor.roles?.includes("REPRESENTATIVE")
  );
}

function canCreateEvent(actor: AuthUser) {
  return isCampusAdmin(actor) || isRepresentative(actor);
}

function canManageAllEvents(actor: AuthUser) {
  return isCampusAdmin(actor);
}

function canManageOwnEvent(actor: AuthUser, event: Record<string, unknown>) {
  return isRepresentative(actor) && event.organizerId === actor.id;
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
  if (hasRole(actor.role, ["ALUMNI"], actor.roles)) return "ALUMNI";
  if (hasRole(actor.role, ["EMPLOYER"], actor.roles)) return "EMPLOYERS";

  return null;
}

function serializeEvent(event: Record<string, unknown>) {
  return {
    id: String(event._id),
    title: String(event.title),
    description: (event.description as string | null) ?? null,
    eventType: String(event.eventType),
    universityId: String(event.universityId),
    collegeIds: Array.isArray(event.collegeIds)
      ? event.collegeIds.map(String)
      : [],
    departmentIds: Array.isArray(event.departmentIds)
      ? event.departmentIds.map(String)
      : [],
    organizerId: String(event.organizerId ?? event.createdById),
    venue: String(event.venue ?? event.locationName ?? ""),
    startDate: serializeDate(event.startDate ?? event.startAt),
    endDate: serializeDate(event.endDate ?? event.endAt),
    registrationDeadline: serializeDate(event.registrationDeadline),
    capacity:
      typeof event.capacity === "number" ? Number(event.capacity) : null,
    currentAttendees: Number(
      event.currentAttendees ?? event.registeredCount ?? 0,
    ),
    allowWaitlist: Boolean(event.allowWaitlist),
    status: String(event.status),
    visibility: String(event.visibility),
    bannerImage: (event.bannerImage as string | null) ?? null,
    attachments: Array.isArray(event.attachments) ? event.attachments : [],
    qrCode: String(event.qrCode),
    analytics: {
      registrations: Number(event.registrations ?? 0),
      attendance: Number(event.attendance ?? 0),
      attendanceRate: Number(event.attendanceRate ?? 0),
      dropOffRate: Number(event.dropOffRate ?? 0),
      capacityUtilization: Number(event.capacityUtilization ?? 0),
      waitlistCount: Number(event.waitlistCount ?? 0),
    },
    deletedAt: serializeDate(event.deletedAt),
    createdAt: serializeDate(event.createdAt),
    updatedAt: serializeDate(event.updatedAt),
  };
}

function serializeAttendance(attendance: Record<string, unknown>) {
  return {
    id: String(attendance._id),
    universityId: String(attendance.universityId),
    eventId: String(attendance.eventId),
    userId: String(attendance.userId),
    joinedAt: serializeDate(attendance.joinedAt),
    leftAt: serializeDate(attendance.leftAt),
    checkedInAt: serializeDate(attendance.checkedInAt),
    attendanceStatus: String(attendance.attendanceStatus),
    checkedInBy: (attendance.checkedInBy as string | null) ?? null,
    createdAt: serializeDate(attendance.createdAt),
    updatedAt: serializeDate(attendance.updatedAt),
  };
}

async function assertAudienceScope(
  universityId: string,
  collegeIds: string[],
  departmentIds: string[],
) {
  const [colleges, departments] = await Promise.all([
    collegeIds.length
      ? CollegeModel.find({
          _id: { $in: collegeIds },
          universityId,
          ...deletedFilter,
        }).lean()
      : [],
    departmentIds.length
      ? DepartmentModel.find({
          _id: { $in: departmentIds },
          universityId,
          ...deletedFilter,
        }).lean()
      : [],
  ]);

  if (colleges.length !== collegeIds.length) {
    throw forbidden("One or more colleges do not belong to this university.");
  }

  if (departments.length !== departmentIds.length) {
    throw forbidden(
      "One or more departments do not belong to this university.",
    );
  }
}

function assertRepresentativeAudience(
  actor: AuthUser,
  visibility: EventVisibility,
  collegeIds: string[],
) {
  if (!isRepresentative(actor) || isCampusAdmin(actor)) {
    return;
  }

  if (!actor.collegeId) {
    throw forbidden("Representative must be assigned to a college.");
  }

  if (visibility === "ALL_USERS") {
    throw forbidden("Representatives must target their assigned college.");
  }

  if (collegeIds.some((collegeId) => collegeId !== actor.collegeId)) {
    throw forbidden("Representatives can only target their assigned college.");
  }
}

function visibleEventFilter(actor: AuthUser) {
  const roleVisibility = userRoleVisibility(actor);
  const visibilityClauses: Record<string, unknown>[] = [
    { visibility: "ALL_USERS" },
  ];

  if (roleVisibility) {
    visibilityClauses.push({ visibility: roleVisibility });
  }

  if (actor.collegeId) {
    visibilityClauses.push({
      visibility: "SPECIFIC_COLLEGES",
      collegeIds: actor.collegeId,
    });
  }

  if (actor.departmentId) {
    visibilityClauses.push({
      visibility: "SPECIFIC_DEPARTMENTS",
      departmentIds: actor.departmentId,
    });
  }

  return {
    universityId: actor.universityId,
    status: { $in: ["OPEN", "FULL", "ONGOING", "COMPLETED"] },
    ...deletedFilter,
    $or: visibilityClauses,
  };
}

function canViewEvent(actor: AuthUser, event: Record<string, unknown>) {
  if (actor.universityId !== event.universityId) return false;
  if (canManageAllEvents(actor) || canManageOwnEvent(actor, event)) return true;

  switch (event.visibility) {
    case "ALL_USERS":
      return true;
    case "STUDENTS":
    case "TEACHERS":
    case "ALUMNI":
    case "EMPLOYERS":
      return userRoleVisibility(actor) === event.visibility;
    case "SPECIFIC_COLLEGES":
      return (
        Boolean(actor.collegeId) &&
        Array.isArray(event.collegeIds) &&
        event.collegeIds.includes(actor.collegeId)
      );
    case "SPECIFIC_DEPARTMENTS":
      return (
        Boolean(actor.departmentId) &&
        Array.isArray(event.departmentIds) &&
        event.departmentIds.includes(actor.departmentId)
      );
    default:
      return false;
  }
}

function assertCanMutate(actor: AuthUser, event: Record<string, unknown>) {
  if (canManageAllEvents(actor) || canManageOwnEvent(actor, event)) {
    return;
  }

  throw forbidden("You cannot manage this event.");
}

async function emitEventNotification(
  type:
    | "EVENT_CREATED"
    | "EVENT_REMINDER"
    | "EVENT_REGISTRATION_CONFIRMATION"
    | "EVENT_FULL"
    | "EVENT_CANCELLED",
  actor: AuthUser,
  event: Record<string, unknown>,
  recipientId?: string,
) {
  await emitNotificationEvent({
    type,
    universityId: String(event.universityId),
    actorId: actor.id,
    recipientId,
    entityType: "event",
    entityId: String(event._id),
    metadata: {
      title: event.title,
      eventType: event.eventType,
      status: event.status,
    },
  });
}

async function recalculateEventAnalytics(eventId: string) {
  const event = await EventModel.findById(eventId).lean();

  if (!event) return;

  const [registrations, waitlistCount, attendance] = await Promise.all([
    EventAttendanceModel.countDocuments({
      eventId,
      attendanceStatus: { $in: ["REGISTERED", "CHECKED_IN"] },
    }),
    EventAttendanceModel.countDocuments({
      eventId,
      attendanceStatus: "WAITLISTED",
    }),
    EventAttendanceModel.countDocuments({
      eventId,
      attendanceStatus: "CHECKED_IN",
    }),
  ]);
  const capacity = typeof event.capacity === "number" ? event.capacity : null;
  const attendanceRate =
    registrations > 0
      ? Math.round((attendance / registrations) * 10000) / 100
      : 0;
  const dropOffRate =
    registrations > 0
      ? Math.round(((registrations - attendance) / registrations) * 10000) / 100
      : 0;
  const capacityUtilization =
    capacity && capacity > 0
      ? Math.round((registrations / capacity) * 10000) / 100
      : 0;
  const nextStatus =
    event.status === "OPEN" && capacity && registrations >= capacity
      ? "FULL"
      : event.status === "FULL" && (!capacity || registrations < capacity)
        ? "OPEN"
        : event.status;

  await EventModel.updateOne(
    { _id: eventId },
    {
      $set: {
        registrations,
        registeredCount: registrations,
        currentAttendees: registrations,
        waitlistCount,
        attendance,
        checkedInCount: attendance,
        attendanceRate,
        dropOffRate,
        capacityUtilization,
        status: nextStatus,
      },
    },
  );
}

async function getEventForActor(eventId: string, actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const event = await EventModel.findOne({
    _id: eventId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!event) {
    throw notFound("Event not found.");
  }

  if (!canViewEvent(actor, event as Record<string, unknown>)) {
    throw forbidden("You cannot access this event.");
  }

  return event;
}

export async function createEvent(input: CreateEventInput) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);

  if (!canCreateEvent(actor)) {
    throw forbidden("You cannot create events.");
  }

  await connectMongo();
  const payload = createEventSchema.parse(input);
  const collegeIds = normalizeIds(payload.collegeIds);
  const departmentIds = normalizeIds(payload.departmentIds);

  await assertAudienceScope(universityId, collegeIds, departmentIds);
  assertRepresentativeAudience(actor, payload.visibility, collegeIds);

  const event = await EventModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: collegeIds[0] ?? actor.collegeId ?? null,
    departmentId: departmentIds[0] ?? actor.departmentId ?? null,
    collegeIds,
    departmentIds,
    title: payload.title,
    description: payload.description ?? null,
    eventType: payload.eventType,
    organizerId: actor.id,
    venue: payload.venue,
    locationName: payload.venue,
    startDate: payload.startDate,
    endDate: payload.endDate,
    startAt: payload.startDate,
    endAt: payload.endDate,
    registrationDeadline: payload.registrationDeadline ?? null,
    registrationRequired: true,
    capacity: payload.capacity ?? null,
    allowWaitlist: payload.allowWaitlist,
    status: payload.status,
    visibility: payload.visibility,
    bannerImage: payload.bannerImage ?? null,
    attachments: payload.attachments,
    qrCode: generateQrCode(),
    targetAudience: {
      universityWide: payload.visibility === "ALL_USERS",
      collegeIds,
      departmentIds,
      roles: payload.visibility.endsWith("S") ? [payload.visibility] : [],
    },
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "EVENT_CREATED",
    entityType: "event",
    entityId: String(event._id),
    after: serializeEvent(event.toObject()),
  });
  await emitEventNotification("EVENT_CREATED", actor, event.toObject());

  return serializeEvent(event.toObject());
}

export async function listEvents(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  const filters = eventQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = canManageAllEvents(actor)
    ? { universityId, ...deletedFilter }
    : {
        $or: [
          visibleEventFilter(actor),
          ...(isRepresentative(actor)
            ? [{ universityId, organizerId: actor.id, ...deletedFilter }]
            : []),
        ],
      };

  if (filters.mine) dbFilter.organizerId = actor.id;
  if (filters.status) {
    dbFilter.status = filters.status;
  } else if (!filters.includeCancelled) {
    dbFilter.status = { $ne: "CANCELLED" };
  }
  if (filters.eventType) dbFilter.eventType = filters.eventType;
  if (filters.from || filters.to) {
    dbFilter.startDate = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }
  if (filters.q) dbFilter.$text = { $search: filters.q };

  const events = await EventModel.find(dbFilter).sort({ startDate: 1 }).lean();

  return events.map((event) =>
    serializeEvent(event as Record<string, unknown>),
  );
}

export async function getEvent(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getEventForActor(eventId, actor);

  return serializeEvent(event as Record<string, unknown>);
}

export async function updateEvent(eventId: string, input: UpdateEventInput) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = updateEventSchema.parse(input);
  const before = await getEventForActor(eventId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const universityId = String(before.universityId);
  const nextCollegeIds = normalizeIds(
    payload.collegeIds ?? (before.collegeIds as string[] | undefined),
  );
  const nextDepartmentIds = normalizeIds(
    payload.departmentIds ?? (before.departmentIds as string[] | undefined),
  );
  const nextVisibility =
    payload.visibility ?? (before.visibility as EventVisibility);

  await assertAudienceScope(universityId, nextCollegeIds, nextDepartmentIds);
  assertRepresentativeAudience(actor, nextVisibility, nextCollegeIds);

  const update: Record<string, unknown> = {
    updatedById: actor.id,
  };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.description !== undefined)
    update.description = payload.description ?? null;
  if (payload.eventType !== undefined) update.eventType = payload.eventType;
  if (payload.venue !== undefined) {
    update.venue = payload.venue;
    update.locationName = payload.venue;
  }
  if (payload.startDate !== undefined) {
    update.startDate = payload.startDate;
    update.startAt = payload.startDate;
  }
  if (payload.endDate !== undefined) {
    update.endDate = payload.endDate;
    update.endAt = payload.endDate;
  }
  if (payload.registrationDeadline !== undefined) {
    update.registrationDeadline = payload.registrationDeadline ?? null;
  }
  if (payload.capacity !== undefined)
    update.capacity = payload.capacity ?? null;
  if (payload.allowWaitlist !== undefined)
    update.allowWaitlist = payload.allowWaitlist;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.bannerImage !== undefined)
    update.bannerImage = payload.bannerImage ?? null;
  if (payload.attachments !== undefined)
    update.attachments = payload.attachments;
  if (payload.collegeIds !== undefined) {
    update.collegeIds = nextCollegeIds;
    update.collegeId = nextCollegeIds[0] ?? null;
  }
  if (payload.departmentIds !== undefined) {
    update.departmentIds = nextDepartmentIds;
    update.departmentId = nextDepartmentIds[0] ?? null;
  }

  update.targetAudience = {
    universityWide: nextVisibility === "ALL_USERS",
    collegeIds: nextCollegeIds,
    departmentIds: nextDepartmentIds,
    roles: nextVisibility.endsWith("S") ? [nextVisibility] : [],
  };

  const event = await EventModel.findOneAndUpdate(
    { _id: eventId, universityId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await recalculateEventAnalytics(eventId);
  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "EVENT_UPDATED",
    entityType: "event",
    entityId: eventId,
    before: serializeEvent(before as Record<string, unknown>),
    after: event ? serializeEvent(event as Record<string, unknown>) : null,
  });

  const refreshed = await EventModel.findById(eventId).lean();
  return serializeEvent((refreshed ?? event) as Record<string, unknown>);
}

export async function deleteEvent(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getEventForActor(eventId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const event = await EventModel.findOneAndUpdate(
    { _id: eventId, universityId: actor.universityId, ...deletedFilter },
    {
      $set: {
        status: "CANCELLED",
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
    action: "EVENT_DELETED",
    entityType: "event",
    entityId: eventId,
    before: serializeEvent(before as Record<string, unknown>),
    after: event ? serializeEvent(event as Record<string, unknown>) : null,
  });

  return serializeEvent(event as Record<string, unknown>);
}

export async function cancelEvent(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getEventForActor(eventId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const event = await EventModel.findOneAndUpdate(
    { _id: eventId, universityId: actor.universityId, ...deletedFilter },
    { $set: { status: "CANCELLED", updatedById: actor.id } },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "EVENT_CANCELLED",
    entityType: "event",
    entityId: eventId,
    before: serializeEvent(before as Record<string, unknown>),
    after: event ? serializeEvent(event as Record<string, unknown>) : null,
  });

  if (event) await emitEventNotification("EVENT_CANCELLED", actor, event);

  return serializeEvent(event as Record<string, unknown>);
}

function assertCanRegister(event: Record<string, unknown>) {
  if (!["OPEN", "FULL"].includes(String(event.status))) {
    throw forbidden("Registration is not open for this event.");
  }

  const deadline = event.registrationDeadline;
  if (deadline instanceof Date && deadline.getTime() < Date.now()) {
    throw forbidden("Registration deadline has passed.");
  }
}

export async function joinEvent(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getEventForActor(eventId, actor);

  assertCanRegister(event as Record<string, unknown>);

  const existingAttendance = await EventAttendanceModel.findOne({
    eventId,
    userId: actor.id,
    attendanceStatus: { $in: ["REGISTERED", "WAITLISTED", "CHECKED_IN"] },
  }).lean();

  if (existingAttendance) {
    return {
      event: serializeEvent(event as Record<string, unknown>),
      attendance: serializeAttendance(
        existingAttendance as Record<string, unknown>,
      ),
    };
  }

  const activeRegistrations = await EventAttendanceModel.countDocuments({
    eventId,
    attendanceStatus: { $in: ["REGISTERED", "CHECKED_IN"] },
  });
  const capacity = typeof event.capacity === "number" ? event.capacity : null;
  const hasCapacity = !capacity || activeRegistrations < capacity;
  const attendanceStatus = hasCapacity ? "REGISTERED" : "WAITLISTED";

  if (!hasCapacity && !event.allowWaitlist) {
    throw forbidden("Event is full.");
  }

  const attendance = await EventAttendanceModel.findOneAndUpdate(
    { eventId, userId: actor.id },
    {
      $set: {
        universityId: event.universityId,
        eventId,
        userId: actor.id,
        attendanceStatus,
        leftAt: null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        joinedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  ).lean();

  await recalculateEventAnalytics(eventId);
  const refreshed = await EventModel.findById(eventId).lean();
  const action =
    attendanceStatus === "WAITLISTED" ? "EVENT_WAITLISTED" : "EVENT_JOINED";

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action,
    entityType: "event_attendance",
    entityId: String(attendance?._id),
    after: attendance ? serializeAttendance(attendance) : null,
  });
  await emitEventNotification(
    "EVENT_REGISTRATION_CONFIRMATION",
    actor,
    refreshed ?? event,
    actor.id,
  );

  if (refreshed?.status === "FULL") {
    await emitEventNotification("EVENT_FULL", actor, refreshed);
  }

  return {
    event: serializeEvent((refreshed ?? event) as Record<string, unknown>),
    attendance: serializeAttendance(attendance as Record<string, unknown>),
  };
}

export async function sendEventReminder(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getEventForActor(eventId, actor);

  assertCanMutate(actor, event as Record<string, unknown>);

  await emitEventNotification(
    "EVENT_REMINDER",
    actor,
    event as Record<string, unknown>,
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action: "EVENT_REMINDER_SENT",
    entityType: "event",
    entityId: eventId,
  });

  return serializeEvent(event as Record<string, unknown>);
}

export async function leaveEvent(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getEventForActor(eventId, actor);
  const attendance = await EventAttendanceModel.findOneAndUpdate(
    {
      eventId,
      userId: actor.id,
      attendanceStatus: { $in: ["REGISTERED", "WAITLISTED"] },
    },
    {
      $set: {
        attendanceStatus: "CANCELLED",
        leftAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!attendance) {
    throw notFound("Active event registration not found.");
  }

  await recalculateEventAnalytics(eventId);
  const refreshed = await EventModel.findById(eventId).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action: "EVENT_LEFT",
    entityType: "event_attendance",
    entityId: String(attendance._id),
    after: serializeAttendance(attendance as Record<string, unknown>),
  });

  return {
    event: serializeEvent((refreshed ?? event) as Record<string, unknown>),
    attendance: serializeAttendance(attendance as Record<string, unknown>),
  };
}

export async function listEventAttendance(eventId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const event = await getEventForActor(eventId, actor);

  assertCanMutate(actor, event as Record<string, unknown>);

  const attendance = await EventAttendanceModel.find({ eventId })
    .sort({ joinedAt: -1 })
    .lean();

  return attendance.map((record) =>
    serializeAttendance(record as Record<string, unknown>),
  );
}

export async function validateEventQr(eventId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = qrValidationSchema.parse(input);
  const event = await getEventForActor(eventId, actor);

  assertCanMutate(actor, event as Record<string, unknown>);

  if (event.qrCode !== payload.qrCode) {
    throw forbidden("Invalid event QR code.");
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action: "EVENT_QR_VALIDATED",
    entityType: "event",
    entityId: eventId,
    metadata: {
      userId: payload.userId ?? null,
    },
  });

  return {
    valid: true,
    event: serializeEvent(event as Record<string, unknown>),
  };
}

export async function checkInEventAttendance(eventId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = qrValidationSchema.parse(input);
  const event = await getEventForActor(eventId, actor);

  assertCanMutate(actor, event as Record<string, unknown>);

  if (event.qrCode !== payload.qrCode) {
    throw forbidden("Invalid event QR code.");
  }

  const userId = payload.userId ?? actor.id;
  const attendance = await EventAttendanceModel.findOneAndUpdate(
    {
      eventId,
      userId,
      attendanceStatus: { $in: ["REGISTERED", "CHECKED_IN"] },
    },
    {
      $set: {
        attendanceStatus: "CHECKED_IN",
        checkedInAt: new Date(),
        checkedInBy: actor.id,
      },
    },
    { new: true },
  ).lean();

  if (!attendance) {
    throw notFound("Registered attendee not found.");
  }

  await recalculateEventAnalytics(eventId);
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(event.universityId),
    action: "EVENT_CHECKED_IN",
    entityType: "event_attendance",
    entityId: String(attendance._id),
    after: serializeAttendance(attendance as Record<string, unknown>),
  });

  const refreshed = await EventModel.findById(eventId).lean();

  return {
    event: serializeEvent((refreshed ?? event) as Record<string, unknown>),
    attendance: serializeAttendance(attendance as Record<string, unknown>),
  };
}
