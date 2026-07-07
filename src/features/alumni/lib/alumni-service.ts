import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  alumniAnalyticsQuerySchema,
  alumniConnectionRequestSchema,
  alumniConnectionResponseSchema,
  alumniSearchQuerySchema,
  createAlumniProfileSchema,
  updateAlumniProfileSchema,
} from "@/features/alumni/lib/alumni-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AlumniConnectionModel,
  AlumniProfileModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";
import type { PipelineStage } from "@/lib/db/model-compat";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function canManageAlumni(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.USER_MANAGE)
  );
}

function canCreateAlumniProfile(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.ALUMNI_PROFILE_CREATE) ||
    hasRole(actor.role, ["STUDENT", "ALUMNI"], actor.roles)
  );
}

function canReadAlumniProfile(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.ALUMNI_PROFILE_READ) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "EMPLOYER", "ALUMNI", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function canUpdateAlumniProfile(
  actor: AuthUser,
  profile: Record<string, unknown>,
) {
  return (
    profile.userId === actor.id ||
    canManageAlumni(actor) ||
    hasPermission(actor, PERMISSIONS.ALUMNI_PROFILE_UPDATE)
  );
}

function canConnectAlumni(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.ALUMNI_CONNECT) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "EMPLOYER", "ALUMNI"],
      actor.roles,
    )
  );
}

function canReadAlumniAnalytics(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.ALUMNI_ANALYTICS_READ) ||
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles)
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
    throw forbidden("Cannot access another university's alumni network.");
  }

  return actor.universityId;
}

function applyVisibilityScope(
  actor: AuthUser,
  filter: Record<string, unknown>,
  requestedUniversityId?: string,
) {
  const universityId = resolveUniversityScope(actor, requestedUniversityId);
  if (universityId) filter.universityId = universityId;

  if (canManageAlumni(actor)) return;

  filter.$or = [
    { visibility: "PUBLIC" },
    ...(actor.universityId
      ? [{ visibility: "UNIVERSITY", universityId: actor.universityId }]
      : []),
    ...(actor.universityId && actor.collegeId
      ? [
          {
            visibility: "COLLEGE",
            universityId: actor.universityId,
            collegeId: actor.collegeId,
          },
        ]
      : []),
    { userId: actor.id },
  ];
}

function canViewProfile(actor: AuthUser, profile: Record<string, unknown>) {
  if (profile.userId === actor.id || canManageAlumni(actor)) return true;
  if (profile.visibility === "PUBLIC") return true;
  if (
    profile.visibility === "UNIVERSITY" &&
    actor.universityId &&
    profile.universityId === actor.universityId
  ) {
    return true;
  }
  if (
    profile.visibility === "COLLEGE" &&
    actor.universityId &&
    actor.collegeId &&
    profile.universityId === actor.universityId &&
    profile.collegeId === actor.collegeId
  ) {
    return true;
  }

  return false;
}

function serializeUser(user: Record<string, unknown> | undefined) {
  if (!user) return null;

  return {
    id: String(user._id),
    name: String(user.name ?? ""),
    username: typeof user.username === "string" ? user.username : null,
    firstName: typeof user.firstName === "string" ? user.firstName : null,
    lastName: typeof user.lastName === "string" ? user.lastName : null,
    avatar:
      typeof user.avatar === "string"
        ? user.avatar
        : typeof user.image === "string"
          ? user.image
          : null,
    role: String(user.role ?? "ALUMNI"),
    universityId:
      typeof user.universityId === "string" ? user.universityId : null,
    collegeId: typeof user.collegeId === "string" ? user.collegeId : null,
    departmentId:
      typeof user.departmentId === "string" ? user.departmentId : null,
  };
}

function serializeProfile(
  profile: Record<string, unknown>,
  user?: Record<string, unknown>,
) {
  return {
    id: String(profile._id),
    userId: String(profile.userId),
    universityId: String(profile.universityId),
    graduationYear: Number(profile.graduationYear),
    degree: String(profile.degree ?? ""),
    collegeId: typeof profile.collegeId === "string" ? profile.collegeId : null,
    departmentId:
      typeof profile.departmentId === "string" ? profile.departmentId : null,
    currentCompany:
      typeof profile.currentCompany === "string"
        ? profile.currentCompany
        : null,
    currentPosition:
      typeof profile.currentPosition === "string"
        ? profile.currentPosition
        : null,
    industry: typeof profile.industry === "string" ? profile.industry : null,
    location: typeof profile.location === "string" ? profile.location : null,
    country: typeof profile.country === "string" ? profile.country : null,
    bio: typeof profile.bio === "string" ? profile.bio : null,
    linkedinUrl:
      typeof profile.linkedinUrl === "string" ? profile.linkedinUrl : null,
    portfolioUrl:
      typeof profile.portfolioUrl === "string" ? profile.portfolioUrl : null,
    visibility: String(profile.visibility ?? "UNIVERSITY"),
    status: String(profile.status ?? "ACTIVE"),
    viewCount: Number(profile.viewCount ?? 0),
    connectionCount: Number(profile.connectionCount ?? 0),
    user: serializeUser(user),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  };
}

function serializeConnection(connection: Record<string, unknown>) {
  return {
    id: String(connection._id),
    universityId: String(connection.universityId),
    requesterId: String(connection.requesterId),
    recipientId: String(connection.recipientId),
    status: String(connection.status ?? "PENDING"),
    message: typeof connection.message === "string" ? connection.message : null,
    requestedAt: serializeDate(connection.requestedAt),
    respondedAt: serializeDate(connection.respondedAt),
    respondedById:
      typeof connection.respondedById === "string"
        ? connection.respondedById
        : null,
  };
}

async function getUsersByIds(userIds: string[]) {
  if (!userIds.length) return new Map<string, Record<string, unknown>>();

  const users = await UserModel.find({ _id: { $in: userIds } }).lean();

  return new Map(
    users.map((user) => [String(user._id), user as Record<string, unknown>]),
  );
}

export async function becomeAlumni(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateAlumniProfile(actor)) {
    throw forbidden("Alumni profile creation access is required.");
  }
  if (!actor.universityId) throw forbidden("University scope is required.");
  await connectPostgres();

  const payload = createAlumniProfileSchema.parse(input);
  const existing = await AlumniProfileModel.exists({
    userId: actor.id,
    ...deletedFilter,
  });
  if (existing) throw forbidden("Alumni profile already exists.");

  const profile = await AlumniProfileModel.create({
    _id: randomUUID(),
    userId: actor.id,
    universityId: actor.universityId,
    graduationYear: payload.graduationYear,
    degree: payload.degree,
    collegeId: payload.collegeId ?? actor.collegeId ?? null,
    departmentId: payload.departmentId ?? actor.departmentId ?? null,
    currentCompany: payload.currentCompany ?? null,
    currentPosition: payload.currentPosition ?? null,
    industry: payload.industry ?? null,
    location: payload.location ?? null,
    country: payload.country ?? null,
    bio: payload.bio ?? null,
    linkedinUrl: payload.linkedinUrl ?? null,
    portfolioUrl: payload.portfolioUrl ?? null,
    visibility: payload.visibility,
    status: "ACTIVE",
    createdById: actor.id,
  });

  await Promise.all([
    UserModel.updateOne(
      { _id: actor.id },
      {
        $set: { role: "ALUMNI", userType: "ALUMNI", updatedById: actor.id },
        $addToSet: { roles: "ALUMNI" },
      },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: actor.universityId,
      action: "ALUMNI_PROFILE_CREATED",
      entityType: "alumni_profile",
      entityId: String(profile._id),
      after: serializeProfile(profile.toObject()),
    }),
  ]);

  return serializeProfile(profile.toObject());
}

export async function getMyAlumniProfile() {
  const actor = await requireAuth();
  await connectPostgres();

  const profile = await AlumniProfileModel.findOne({
    userId: actor.id,
    ...deletedFilter,
  }).lean();
  if (!profile) throw notFound("Alumni profile not found.");

  return serializeProfile(profile as Record<string, unknown>);
}

export async function updateMyAlumniProfile(input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const profile = await AlumniProfileModel.findOne({
    userId: actor.id,
    ...deletedFilter,
  }).lean();
  if (!profile) throw notFound("Alumni profile not found.");
  if (!canUpdateAlumniProfile(actor, profile as Record<string, unknown>)) {
    throw forbidden("You cannot update this alumni profile.");
  }

  const payload = updateAlumniProfileSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };
  for (const [key, value] of Object.entries(payload)) {
    update[key] = value ?? null;
  }

  const updated = await AlumniProfileModel.findOneAndUpdate(
    { userId: actor.id, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Alumni profile not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(profile.universityId),
    action: "ALUMNI_PROFILE_UPDATED",
    entityType: "alumni_profile",
    entityId: String(profile._id),
    before: serializeProfile(profile as Record<string, unknown>),
    after: serializeProfile(updated as Record<string, unknown>),
  });

  return serializeProfile(updated as Record<string, unknown>);
}

export async function searchAlumni(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadAlumniProfile(actor)) {
    throw forbidden("Alumni profile read access is required.");
  }
  await connectPostgres();

  const filters = alumniSearchQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
  };
  applyVisibilityScope(actor, dbFilter, filters.universityId);
  if (filters.graduationYear) dbFilter.graduationYear = filters.graduationYear;
  if (filters.collegeId) dbFilter.collegeId = filters.collegeId;
  if (filters.departmentId) dbFilter.departmentId = filters.departmentId;
  if (filters.industry) dbFilter.industry = filters.industry;
  if (filters.country) dbFilter.country = filters.country;
  if (filters.company) dbFilter.currentCompany = filters.company;
  if (filters.position) dbFilter.currentPosition = filters.position;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const profiles = await AlumniProfileModel.find(dbFilter)
    .sort({ graduationYear: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();
  const users = await getUsersByIds(
    profiles.map((profile) => String(profile.userId)),
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: resolveUniversityScope(actor, filters.universityId),
    action: "ALUMNI_SEARCHED",
    entityType: "alumni_profile",
    entityId: "search",
    metadata: filters,
  });

  return profiles.map((profile) =>
    serializeProfile(
      profile as Record<string, unknown>,
      users.get(String(profile.userId)),
    ),
  );
}

export async function getAlumniProfile(userId: string) {
  const actor = await requireAuth();
  if (!canReadAlumniProfile(actor)) {
    throw forbidden("Alumni profile read access is required.");
  }
  await connectPostgres();

  const profile = await AlumniProfileModel.findOne({
    userId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!profile || !canViewProfile(actor, profile as Record<string, unknown>)) {
    throw notFound("Alumni profile not found.");
  }
  const user = await UserModel.findById(userId).lean();

  await Promise.all([
    profile.userId === actor.id
      ? Promise.resolve()
      : AlumniProfileModel.updateOne({ _id: profile._id }, { $inc: { viewCount: 1 } }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(profile.universityId),
      action: "ALUMNI_PROFILE_VIEWED",
      entityType: "alumni_profile",
      entityId: String(profile._id),
      metadata: { profileUserId: userId },
    }),
  ]);

  return serializeProfile(
    profile as Record<string, unknown>,
    user as Record<string, unknown> | undefined,
  );
}

export async function connectAlumni(userId: string, input: unknown = {}) {
  const actor = await requireAuth();
  if (!canConnectAlumni(actor)) {
    throw forbidden("Alumni connection access is required.");
  }
  if (userId === actor.id) throw forbidden("You cannot connect with yourself.");
  await connectPostgres();

  const payload = alumniConnectionRequestSchema.parse(input);
  const profile = await AlumniProfileModel.findOne({
    userId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!profile || !canViewProfile(actor, profile as Record<string, unknown>)) {
    throw notFound("Alumni profile not found.");
  }

  const existing = await AlumniConnectionModel.findOne({
    $or: [
      { requesterId: actor.id, recipientId: userId },
      { requesterId: userId, recipientId: actor.id },
    ],
  }).lean();
  if (existing) {
    return {
      connection: serializeConnection(existing as Record<string, unknown>),
      duplicate: true,
    };
  }

  const connection = await AlumniConnectionModel.create({
    _id: randomUUID(),
    universityId: String(profile.universityId),
    requesterId: actor.id,
    recipientId: userId,
    status: "PENDING",
    requestedAt: new Date(),
    message: payload.message ?? null,
  });

  await Promise.all([
    createSystemNotification({
      target: { recipientId: userId },
      senderId: actor.id,
      type: "SYSTEM",
      title: "New alumni connection request",
      message: "You received a new alumni network connection request.",
      entityType: "alumni_connection",
      entityId: String(connection._id),
      actionUrl: "/alumni/community",
      priority: "NORMAL",
      metadata: { requesterId: actor.id },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(profile.universityId),
      action: "ALUMNI_CONNECTION_REQUESTED",
      entityType: "alumni_connection",
      entityId: String(connection._id),
      after: serializeConnection(connection.toObject()),
    }),
  ]);

  return {
    connection: serializeConnection(connection.toObject()),
    duplicate: false,
  };
}

export async function respondToAlumniConnection(
  connectionId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();

  const payload = alumniConnectionResponseSchema.parse(input);
  const connection = await AlumniConnectionModel.findById(connectionId).lean();
  if (!connection) throw notFound("Alumni connection not found.");
  if (
    connection.recipientId !== actor.id &&
    !canManageAlumni(actor)
  ) {
    throw forbidden("Only the recipient can respond to this connection.");
  }

  const updated = await AlumniConnectionModel.findOneAndUpdate(
    { _id: connectionId },
    {
      $set: {
        status: payload.status,
        respondedAt: new Date(),
        respondedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Alumni connection not found.");

  await Promise.all([
    payload.status === "ACCEPTED" && connection.status !== "ACCEPTED"
      ? AlumniProfileModel.updateMany(
          { userId: { $in: [connection.requesterId, connection.recipientId] } },
          { $inc: { connectionCount: 1 } },
        )
      : Promise.resolve(),
    createSystemNotification({
      target: { recipientId: String(connection.requesterId) },
      senderId: actor.id,
      type: "SYSTEM",
      title: "Alumni connection updated",
      message: `Your alumni connection request was ${payload.status.toLowerCase()}.`,
      entityType: "alumni_connection",
      entityId: connectionId,
      actionUrl: "/alumni/community",
      priority: "NORMAL",
      metadata: { status: payload.status },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(connection.universityId),
      action: "ALUMNI_CONNECTION_RESPONDED",
      entityType: "alumni_connection",
      entityId: connectionId,
      before: serializeConnection(connection as Record<string, unknown>),
      after: serializeConnection(updated as Record<string, unknown>),
    }),
  ]);

  return serializeConnection(updated as Record<string, unknown>);
}

function buildGroupPipeline(input: {
  match: Record<string, unknown>;
  field: string;
  limit: number;
}): PipelineStage[] {
  return [
    { $match: input.match },
    {
      $group: {
        _id: `$${input.field}`,
        count: { $sum: 1 },
      },
    },
    { $match: { _id: { $nin: [null, ""] } } },
    { $sort: { count: -1 as const, _id: 1 as const } },
    { $limit: input.limit },
  ];
}

function serializeDistribution(rows: Array<{ _id: string; count: number }>) {
  return rows.map((row) => ({
    value: String(row._id),
    count: Number(row.count ?? 0),
  }));
}

export async function getAlumniAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadAlumniAnalytics(actor)) {
    throw forbidden("Alumni analytics access is required.");
  }
  await connectPostgres();

  const filters = alumniAnalyticsQuerySchema.parse(query);
  const universityId = resolveUniversityScope(actor, filters.universityId);
  const match: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
  };
  if (universityId) match.universityId = universityId;
  if (filters.collegeId) match.collegeId = filters.collegeId;
  if (filters.departmentId) match.departmentId = filters.departmentId;
  if (filters.graduationYear) match.graduationYear = filters.graduationYear;

  const [
    alumniCount,
    industryDistribution,
    topEmployers,
    topLocations,
    graduationYears,
  ] = await Promise.all([
    AlumniProfileModel.countDocuments(match),
    AlumniProfileModel.aggregate(
      buildGroupPipeline({
        match,
        field: "industry",
        limit: filters.limit,
      }),
    ),
    AlumniProfileModel.aggregate(
      buildGroupPipeline({
        match,
        field: "currentCompany",
        limit: filters.limit,
      }),
    ),
    AlumniProfileModel.aggregate(
      buildGroupPipeline({
        match,
        field: "country",
        limit: filters.limit,
      }),
    ),
    AlumniProfileModel.aggregate(
      buildGroupPipeline({
        match,
        field: "graduationYear",
        limit: filters.limit,
      }),
    ),
  ]);

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ALUMNI_ANALYTICS_VIEWED",
    entityType: "alumni_analytics",
    entityId: universityId ?? "aggregate",
    metadata: filters,
  });

  return {
    scope: {
      universityId: universityId ?? null,
      collegeId: filters.collegeId ?? null,
      departmentId: filters.departmentId ?? null,
      graduationYear: filters.graduationYear ?? null,
    },
    alumniCount,
    industryDistribution: serializeDistribution(industryDistribution),
    topEmployers: serializeDistribution(topEmployers),
    topLocations: serializeDistribution(topLocations),
    graduationYears: serializeDistribution(graduationYears),
  };
}
