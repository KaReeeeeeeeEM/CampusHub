import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  createMentorProfileSchema,
  createMentorshipRequestSchema,
  createMentorshipSessionSchema,
  mentorProfileQuerySchema,
  mentorshipDecisionSchema,
  mentorshipRequestQuerySchema,
  updateMentorProfileSchema,
  updateMentorshipSessionSchema,
} from "@/features/mentorship/lib/mentorship-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  MentorProfileModel,
  MentorshipRequestModel,
  MentorshipSessionModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeList(values: string[] = []) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function canManageMentorship(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.MENTORSHIP_MODERATE)
  );
}

function canCreateMentorship(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.MENTORSHIP_CREATE) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER"],
      actor.roles,
    )
  );
}

function canReadMentorship(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.MENTORSHIP_READ) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function resolveUniversityScope(
  actor: AuthUser,
  requestedUniversityId?: string,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requestedUniversityId ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden("Cannot access another university's mentorship data.");
  }

  return actor.universityId;
}

function serializeUser(user: Record<string, unknown> | undefined) {
  if (!user) return null;

  return {
    id: String(user._id),
    name: String(user.name ?? ""),
    username: typeof user.username === "string" ? user.username : null,
    avatar:
      typeof user.avatar === "string"
        ? user.avatar
        : typeof user.image === "string"
          ? user.image
          : null,
    role: String(user.role ?? "STUDENT"),
    universityId:
      typeof user.universityId === "string" ? user.universityId : null,
  };
}

function serializeMentorProfile(
  profile: Record<string, unknown>,
  user?: Record<string, unknown>,
) {
  return {
    id: String(profile._id),
    userId: String(profile.userId),
    universityId: String(profile.universityId),
    bio: typeof profile.bio === "string" ? profile.bio : null,
    expertise: Array.isArray(profile.expertise)
      ? profile.expertise.map(String)
      : [],
    availability:
      typeof profile.availability === "object" && profile.availability
        ? profile.availability
        : null,
    maxMentees: Number(profile.maxMentees ?? 3),
    currentMentees: Number(profile.currentMentees ?? 0),
    meetingPreferences: Array.isArray(profile.meetingPreferences)
      ? profile.meetingPreferences.map(String)
      : [],
    status: String(profile.status ?? "ACTIVE"),
    user: serializeUser(user),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  };
}

function serializeMentorshipRequest(request: Record<string, unknown>) {
  return {
    id: String(request._id),
    universityId: String(request.universityId),
    mentorProfileId: String(request.mentorProfileId),
    mentorId: String(request.mentorId),
    menteeId: String(request.menteeId),
    message: typeof request.message === "string" ? request.message : null,
    goals: Array.isArray(request.goals) ? request.goals.map(String) : [],
    status: String(request.status ?? "PENDING"),
    acceptedAt: serializeDate(request.acceptedAt),
    declinedAt: serializeDate(request.declinedAt),
    completedAt: serializeDate(request.completedAt),
    cancelledAt: serializeDate(request.cancelledAt),
    respondedById:
      typeof request.respondedById === "string" ? request.respondedById : null,
    createdAt: serializeDate(request.createdAt),
    updatedAt: serializeDate(request.updatedAt),
  };
}

function serializeMentorshipSession(session: Record<string, unknown>) {
  return {
    id: String(session._id),
    universityId: String(session.universityId),
    mentorshipRequestId: String(session.mentorshipRequestId),
    mentorId: String(session.mentorId),
    menteeId: String(session.menteeId),
    title: String(session.title),
    notes: typeof session.notes === "string" ? session.notes : null,
    scheduledAt: serializeDate(session.scheduledAt),
    completedAt: serializeDate(session.completedAt),
    durationMinutes:
      typeof session.durationMinutes === "number"
        ? Number(session.durationMinutes)
        : null,
    meetingUrl: typeof session.meetingUrl === "string" ? session.meetingUrl : null,
    status: String(session.status ?? "SCHEDULED"),
    createdAt: serializeDate(session.createdAt),
    updatedAt: serializeDate(session.updatedAt),
  };
}

async function getUsersByIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, Record<string, unknown>>();
  const users = await UserModel.find({ _id: { $in: userIds } }).lean();

  return new Map(
    users.map((user) => [String(user._id), user as Record<string, unknown>]),
  );
}

async function getRequestOrThrow(requestId: string, actor: AuthUser) {
  const request = await MentorshipRequestModel.findOne({
    _id: requestId,
    ...deletedFilter,
  }).lean();
  if (!request) throw notFound("Mentorship request not found.");
  if (
    !canManageMentorship(actor) &&
    request.mentorId !== actor.id &&
    request.menteeId !== actor.id
  ) {
    throw notFound("Mentorship request not found.");
  }
  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    actor.universityId &&
    request.universityId !== actor.universityId
  ) {
    throw notFound("Mentorship request not found.");
  }

  return request;
}

export async function becomeMentor(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateMentorship(actor)) {
    throw forbidden("Mentorship creation access is required.");
  }
  if (!actor.universityId) throw forbidden("University scope is required.");
  await connectPostgres();

  const payload = createMentorProfileSchema.parse(input);
  const existing = await MentorProfileModel.exists({
    userId: actor.id,
    ...deletedFilter,
  });
  if (existing) throw forbidden("Mentor profile already exists.");

  const profile = await MentorProfileModel.create({
    _id: randomUUID(),
    userId: actor.id,
    universityId: actor.universityId,
    bio: payload.bio ?? null,
    expertise: normalizeList(payload.expertise),
    availability: payload.availability ?? null,
    maxMentees: payload.maxMentees,
    meetingPreferences: normalizeList(payload.meetingPreferences),
    status: payload.status,
    createdById: actor.id,
  });

  await Promise.all([
    createActivity({
      actorId: actor.id,
      actorType: actor.role,
      universityId: actor.universityId,
      activityType: "MENTORSHIP_STARTED",
      title: "New mentor available",
      description: "A CampusHub member is now available for mentorship.",
      entityType: "mentor_profile",
      entityId: String(profile._id),
      visibility: "UNIVERSITY",
      score: 0,
      metadata: { expertise: profile.expertise },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: actor.universityId,
      action: "MENTOR_PROFILE_CREATED",
      entityType: "mentor_profile",
      entityId: String(profile._id),
      after: serializeMentorProfile(profile.toObject()),
    }),
  ]);

  return serializeMentorProfile(profile.toObject());
}

export async function updateMyMentorProfile(input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();

  const profile = await MentorProfileModel.findOne({
    userId: actor.id,
    ...deletedFilter,
  }).lean();
  if (!profile) throw notFound("Mentor profile not found.");
  if (profile.userId !== actor.id && !canManageMentorship(actor)) {
    throw forbidden("You cannot update this mentor profile.");
  }

  const payload = updateMentorProfileSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };
  if (payload.bio !== undefined) update.bio = payload.bio ?? null;
  if (payload.expertise !== undefined)
    update.expertise = normalizeList(payload.expertise);
  if (payload.availability !== undefined)
    update.availability = payload.availability ?? null;
  if (payload.maxMentees !== undefined) update.maxMentees = payload.maxMentees;
  if (payload.meetingPreferences !== undefined) {
    update.meetingPreferences = normalizeList(payload.meetingPreferences);
  }
  if (payload.status !== undefined) update.status = payload.status;

  const updated = await MentorProfileModel.findOneAndUpdate(
    { userId: actor.id, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Mentor profile not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(profile.universityId),
    action: "MENTOR_PROFILE_UPDATED",
    entityType: "mentor_profile",
    entityId: String(profile._id),
    before: serializeMentorProfile(profile as Record<string, unknown>),
    after: serializeMentorProfile(updated as Record<string, unknown>),
  });

  return serializeMentorProfile(updated as Record<string, unknown>);
}

export async function getMyMentorProfile() {
  const actor = await requireAuth();
  await connectPostgres();
  const profile = await MentorProfileModel.findOne({
    userId: actor.id,
    ...deletedFilter,
  }).lean();
  if (!profile) throw notFound("Mentor profile not found.");

  return serializeMentorProfile(profile as Record<string, unknown>);
}

export async function listMentors(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadMentorship(actor)) {
    throw forbidden("Mentorship read access is required.");
  }
  await connectPostgres();

  const filters = mentorProfileQuerySchema.parse(query);
  const universityId = resolveUniversityScope(actor, filters.universityId);
  const dbFilter: Record<string, unknown> = {
    status: filters.status ?? "ACTIVE",
    ...deletedFilter,
  };
  if (universityId) dbFilter.universityId = universityId;
  if (filters.expertise.length) dbFilter.expertise = { $in: filters.expertise };
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const profiles = await MentorProfileModel.find(dbFilter)
    .sort({ currentMentees: 1, createdAt: -1 })
    .limit(filters.limit)
    .lean();
  const users = await getUsersByIds(
    profiles.map((profile) => String(profile.userId)),
  );

  return profiles.map((profile) =>
    serializeMentorProfile(
      profile as Record<string, unknown>,
      users.get(String(profile.userId)),
    ),
  );
}

export async function requestMentor(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateMentorship(actor)) {
    throw forbidden("Mentorship creation access is required.");
  }
  await connectPostgres();

  const payload = createMentorshipRequestSchema.parse(input);
  const mentor = await MentorProfileModel.findOne({
    userId: payload.mentorId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!mentor) throw notFound("Mentor profile not found.");
  if (mentor.userId === actor.id) throw forbidden("You cannot mentor yourself.");
  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    actor.universityId &&
    mentor.universityId !== actor.universityId
  ) {
    throw forbidden("Cannot request mentorship outside your university.");
  }
  if (Number(mentor.currentMentees ?? 0) >= Number(mentor.maxMentees ?? 0)) {
    throw forbidden("This mentor has reached their mentee capacity.");
  }

  let request;
  try {
    request = await MentorshipRequestModel.create({
      _id: randomUUID(),
      universityId: mentor.universityId,
      mentorProfileId: mentor._id,
      mentorId: mentor.userId,
      menteeId: actor.id,
      message: payload.message ?? null,
      goals: normalizeList(payload.goals),
      status: "PENDING",
      createdById: actor.id,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      throw forbidden("A pending mentorship request already exists.");
    }

    throw error;
  }

  await Promise.all([
    createSystemNotification({
      target: { recipientId: String(mentor.userId) },
      senderId: actor.id,
      type: "MENTORSHIP",
      title: "New mentorship request",
      message: "You received a new mentorship request.",
      entityType: "mentorship_request",
      entityId: String(request._id),
      actionUrl: "/alumni/mentorship",
      priority: "NORMAL",
      metadata: { menteeId: actor.id },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(mentor.universityId),
      action: "MENTORSHIP_REQUEST_CREATED",
      entityType: "mentorship_request",
      entityId: String(request._id),
      after: serializeMentorshipRequest(request.toObject()),
    }),
  ]);

  return serializeMentorshipRequest(request.toObject());
}

export async function listMentorshipRequests(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadMentorship(actor)) {
    throw forbidden("Mentorship read access is required.");
  }
  await connectPostgres();

  const filters = mentorshipRequestQuerySchema.parse(query);
  const universityId = resolveUniversityScope(actor, filters.universityId);
  const dbFilter: Record<string, unknown> = { ...deletedFilter };
  if (universityId) dbFilter.universityId = universityId;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  if (!canManageMentorship(actor)) {
    if (filters.role === "MENTOR") dbFilter.mentorId = actor.id;
    else if (filters.role === "MENTEE") dbFilter.menteeId = actor.id;
    else dbFilter.$or = [{ mentorId: actor.id }, { menteeId: actor.id }];
  } else if (filters.role === "MENTOR") {
    dbFilter.mentorId = actor.id;
  } else if (filters.role === "MENTEE") {
    dbFilter.menteeId = actor.id;
  }

  const requests = await MentorshipRequestModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return requests.map((request) =>
    serializeMentorshipRequest(request as Record<string, unknown>),
  );
}

async function decideMentorshipRequest(
  requestId: string,
  status: "ACCEPTED" | "DECLINED",
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectPostgres();

  const payload = mentorshipDecisionSchema.parse(input);
  const request = await getRequestOrThrow(requestId, actor);
  if (request.mentorId !== actor.id && !canManageMentorship(actor)) {
    throw forbidden("Only the mentor can respond to this request.");
  }
  if (request.status !== "PENDING") {
    throw forbidden("Only pending mentorship requests can be updated.");
  }

  const mentor = await MentorProfileModel.findById(request.mentorProfileId).lean();
  if (!mentor) throw notFound("Mentor profile not found.");
  if (
    status === "ACCEPTED" &&
    Number(mentor.currentMentees ?? 0) >= Number(mentor.maxMentees ?? 0)
  ) {
    throw forbidden("This mentor has reached their mentee capacity.");
  }

  const now = new Date();
  const updated = await MentorshipRequestModel.findOneAndUpdate(
    { _id: requestId, status: "PENDING", ...deletedFilter },
    {
      $set: {
        status,
        acceptedAt: status === "ACCEPTED" ? now : null,
        declinedAt: status === "DECLINED" ? now : null,
        respondedById: actor.id,
        updatedById: actor.id,
        metadata: { decisionNote: payload.note ?? null },
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Mentorship request not found.");

  await Promise.all([
    status === "ACCEPTED"
      ? MentorProfileModel.updateOne(
          { _id: request.mentorProfileId },
          { $inc: { currentMentees: 1 } },
        )
      : Promise.resolve(),
    createSystemNotification({
      target: { recipientId: String(request.menteeId) },
      senderId: actor.id,
      type: "MENTORSHIP",
      title:
        status === "ACCEPTED"
          ? "Mentorship accepted"
          : "Mentorship declined",
      message:
        status === "ACCEPTED"
          ? "Your mentorship request was accepted."
          : "Your mentorship request was declined.",
      entityType: "mentorship_request",
      entityId: requestId,
      actionUrl: "/alumni/mentorship",
      priority: status === "ACCEPTED" ? "HIGH" : "NORMAL",
      metadata: { status, note: payload.note ?? null },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(request.universityId),
      action:
        status === "ACCEPTED"
          ? "MENTORSHIP_REQUEST_ACCEPTED"
          : "MENTORSHIP_REQUEST_DECLINED",
      entityType: "mentorship_request",
      entityId: requestId,
      before: serializeMentorshipRequest(request as Record<string, unknown>),
      after: serializeMentorshipRequest(updated as Record<string, unknown>),
    }),
  ]);

  return serializeMentorshipRequest(updated as Record<string, unknown>);
}

export function acceptMentorshipRequest(
  requestId: string,
  input: unknown = {},
) {
  return decideMentorshipRequest(requestId, "ACCEPTED", input);
}

export function declineMentorshipRequest(
  requestId: string,
  input: unknown = {},
) {
  return decideMentorshipRequest(requestId, "DECLINED", input);
}

export async function cancelMentorshipRequest(requestId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const request = await getRequestOrThrow(requestId, actor);
  if (request.menteeId !== actor.id && !canManageMentorship(actor)) {
    throw forbidden("Only the mentee can cancel this request.");
  }
  if (!["PENDING", "ACCEPTED"].includes(String(request.status))) {
    throw forbidden("This mentorship request can no longer be cancelled.");
  }

  const updated = await MentorshipRequestModel.findOneAndUpdate(
    { _id: requestId, ...deletedFilter },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Mentorship request not found.");

  await Promise.all([
    request.status === "ACCEPTED"
      ? MentorProfileModel.updateOne(
          { _id: request.mentorProfileId, currentMentees: { $gt: 0 } },
          { $inc: { currentMentees: -1 } },
        )
      : Promise.resolve(),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(request.universityId),
      action: "MENTORSHIP_REQUEST_CANCELLED",
      entityType: "mentorship_request",
      entityId: requestId,
      before: serializeMentorshipRequest(request as Record<string, unknown>),
      after: serializeMentorshipRequest(updated as Record<string, unknown>),
    }),
  ]);

  return serializeMentorshipRequest(updated as Record<string, unknown>);
}

export async function completeMentorship(requestId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const request = await getRequestOrThrow(requestId, actor);
  if (
    request.mentorId !== actor.id &&
    request.menteeId !== actor.id &&
    !canManageMentorship(actor)
  ) {
    throw forbidden("Only mentorship participants can complete this mentorship.");
  }
  if (request.status !== "ACCEPTED") {
    throw forbidden("Only accepted mentorships can be completed.");
  }

  const updated = await MentorshipRequestModel.findOneAndUpdate(
    { _id: requestId, status: "ACCEPTED", ...deletedFilter },
    {
      $set: {
        status: "COMPLETED",
        completedAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Mentorship request not found.");

  await Promise.all([
    MentorProfileModel.updateOne(
      { _id: request.mentorProfileId, currentMentees: { $gt: 0 } },
      { $inc: { currentMentees: -1 } },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(request.universityId),
      action: "MENTORSHIP_COMPLETED",
      entityType: "mentorship_request",
      entityId: requestId,
      before: serializeMentorshipRequest(request as Record<string, unknown>),
      after: serializeMentorshipRequest(updated as Record<string, unknown>),
    }),
  ]);

  return serializeMentorshipRequest(updated as Record<string, unknown>);
}

export async function createMentorshipSession(
  requestId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const request = await getRequestOrThrow(requestId, actor);
  if (
    request.mentorId !== actor.id &&
    request.menteeId !== actor.id &&
    !canManageMentorship(actor)
  ) {
    throw forbidden("Only mentorship participants can track sessions.");
  }
  if (request.status !== "ACCEPTED") {
    throw forbidden("Sessions can only be tracked for accepted mentorships.");
  }

  const payload = createMentorshipSessionSchema.parse(input);
  const session = await MentorshipSessionModel.create({
    _id: randomUUID(),
    universityId: request.universityId,
    mentorshipRequestId: requestId,
    mentorId: request.mentorId,
    menteeId: request.menteeId,
    title: payload.title,
    notes: payload.notes ?? null,
    scheduledAt: payload.scheduledAt ?? null,
    completedAt: payload.completedAt ?? null,
    durationMinutes: payload.durationMinutes ?? null,
    meetingUrl: payload.meetingUrl ?? null,
    status: payload.status,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(request.universityId),
    action: "MENTORSHIP_SESSION_CREATED",
    entityType: "mentorship_session",
    entityId: String(session._id),
    after: serializeMentorshipSession(session.toObject()),
  });

  return serializeMentorshipSession(session.toObject());
}

export async function listMentorshipSessions(requestId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  await getRequestOrThrow(requestId, actor);

  const sessions = await MentorshipSessionModel.find({
    mentorshipRequestId: requestId,
    ...deletedFilter,
  })
    .sort({ scheduledAt: -1, createdAt: -1 })
    .lean();

  return sessions.map((session) =>
    serializeMentorshipSession(session as Record<string, unknown>),
  );
}

export async function updateMentorshipSession(
  sessionId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const session = await MentorshipSessionModel.findOne({
    _id: sessionId,
    ...deletedFilter,
  }).lean();
  if (!session) throw notFound("Mentorship session not found.");
  const request = await getRequestOrThrow(
    String(session.mentorshipRequestId),
    actor,
  );
  if (
    request.mentorId !== actor.id &&
    request.menteeId !== actor.id &&
    !canManageMentorship(actor)
  ) {
    throw forbidden("Only mentorship participants can update sessions.");
  }

  const payload = updateMentorshipSessionSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };
  if (payload.title !== undefined) update.title = payload.title;
  if (payload.notes !== undefined) update.notes = payload.notes ?? null;
  if (payload.scheduledAt !== undefined)
    update.scheduledAt = payload.scheduledAt ?? null;
  if (payload.completedAt !== undefined)
    update.completedAt = payload.completedAt ?? null;
  if (payload.durationMinutes !== undefined)
    update.durationMinutes = payload.durationMinutes ?? null;
  if (payload.meetingUrl !== undefined)
    update.meetingUrl = payload.meetingUrl ?? null;
  if (payload.status !== undefined) update.status = payload.status;

  const updated = await MentorshipSessionModel.findOneAndUpdate(
    { _id: sessionId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Mentorship session not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(session.universityId),
    action: "MENTORSHIP_SESSION_UPDATED",
    entityType: "mentorship_session",
    entityId: sessionId,
    before: serializeMentorshipSession(session as Record<string, unknown>),
    after: serializeMentorshipSession(updated as Record<string, unknown>),
  });

  return serializeMentorshipSession(updated as Record<string, unknown>);
}
