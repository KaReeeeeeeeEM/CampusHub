import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  createNetworkConnectionSchema,
  createNetworkFollowSchema,
  networkConnectionQuerySchema,
  networkConnectionResponseSchema,
  networkFollowQuerySchema,
  type NetworkFollowEntityType,
} from "@/features/networking/lib/networking-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AlumniProfileModel,
  NetworkConnectionModel,
  NetworkFollowModel,
  ProjectModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function canReadNetwork(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.NETWORK_READ) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function canConnect(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.NETWORK_CONNECT) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER"],
      actor.roles,
    )
  );
}

function canFollow(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.NETWORK_FOLLOW) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER"],
      actor.roles,
    )
  );
}

function canModerateNetwork(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.NETWORK_MODERATE)
  );
}

function resolveUniversityScope(
  actor: AuthUser,
  requestedUniversityId?: string,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requestedUniversityId ?? actor.universityId ?? null;
  }

  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden("Cannot access another university's network.");
  }

  return actor.universityId ?? null;
}

function serializeConnection(connection: Record<string, unknown>) {
  return {
    id: String(connection._id),
    universityId:
      typeof connection.universityId === "string"
        ? connection.universityId
        : null,
    requesterId: String(connection.requesterId),
    receiverId: String(connection.receiverId),
    status: String(connection.status ?? "PENDING"),
    respondedAt: serializeDate(connection.respondedAt),
    respondedById:
      typeof connection.respondedById === "string"
        ? connection.respondedById
        : null,
    metadata: connection.metadata ?? null,
    createdAt: serializeDate(connection.createdAt),
    updatedAt: serializeDate(connection.updatedAt),
  };
}

function serializeFollow(follow: Record<string, unknown>) {
  return {
    id: String(follow._id),
    universityId:
      typeof follow.universityId === "string" ? follow.universityId : null,
    followerId: String(follow.followerId),
    entityType: String(follow.entityType),
    entityId: String(follow.entityId),
    status: String(follow.status ?? "ACTIVE"),
    metadata: follow.metadata ?? null,
    createdAt: serializeDate(follow.createdAt),
    updatedAt: serializeDate(follow.updatedAt),
  };
}

async function getActiveUserOrThrow(userId: string) {
  const user = await UserModel.findOne({
    _id: userId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!user) throw notFound("User not found.");

  return user;
}

function userHasRole(user: Record<string, unknown>, role: string) {
  return (
    user.role === role ||
    (Array.isArray(user.roles) && user.roles.map(String).includes(role))
  );
}

async function resolveFollowTarget(input: {
  actor: AuthUser;
  entityType: NetworkFollowEntityType;
  entityId: string;
}) {
  if (input.entityType === "USER") {
    const user = await getActiveUserOrThrow(input.entityId);

    return {
      universityId:
        typeof user.universityId === "string" ? user.universityId : null,
      ownerId: String(user._id),
      title: String(user.name ?? "user"),
    };
  }

  if (input.entityType === "EMPLOYER") {
    const user = await getActiveUserOrThrow(input.entityId);
    if (!userHasRole(user as Record<string, unknown>, "EMPLOYER")) {
      throw notFound("Employer not found.");
    }

    return {
      universityId:
        typeof user.universityId === "string" ? user.universityId : null,
      ownerId: String(user._id),
      title: String(user.name ?? "employer"),
    };
  }

  if (input.entityType === "ALUMNI") {
    const profile = await AlumniProfileModel.findOne({
      userId: input.entityId,
      status: "ACTIVE",
      ...deletedFilter,
    }).lean();
    if (!profile) throw notFound("Alumni profile not found.");

    return {
      universityId: String(profile.universityId),
      ownerId: String(profile.userId),
      title: "alumni profile",
    };
  }

  if (input.entityType === "PROJECT") {
    const project = await ProjectModel.findOne({
      _id: input.entityId,
      status: "PUBLISHED",
      ...deletedFilter,
    }).lean();
    if (!project) throw notFound("Project not found.");
    if (
      project.visibility !== "PUBLIC" &&
      project.universityId !== input.actor.universityId &&
      !canModerateNetwork(input.actor)
    ) {
      throw notFound("Project not found.");
    }

    return {
      universityId: String(project.universityId),
      ownerId: String(project.ownerId),
      title: String(project.title),
    };
  }

  const university = await UniversityModel.findOne({
    _id: input.entityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!university) throw notFound("University not found.");

  return {
    universityId: String(university._id),
    ownerId: null,
    title: String(university.name),
  };
}

export async function connectUser(input: unknown) {
  const actor = await requireAuth();
  if (!canConnect(actor)) throw forbidden("Network connection access is required.");
  await connectMongo();

  const payload = createNetworkConnectionSchema.parse(input);
  if (payload.receiverId === actor.id) {
    throw forbidden("You cannot connect with yourself.");
  }
  const receiver = await getActiveUserOrThrow(payload.receiverId);
  if (
    actor.universityId &&
    receiver.universityId &&
    receiver.universityId !== actor.universityId &&
    !canModerateNetwork(actor)
  ) {
    throw forbidden("Cannot connect outside your university network.");
  }

  const existing = await NetworkConnectionModel.findOne({
    $or: [
      { requesterId: actor.id, receiverId: payload.receiverId },
      { requesterId: payload.receiverId, receiverId: actor.id },
    ],
  }).lean();
  if (existing) {
    return {
      connection: serializeConnection(existing as Record<string, unknown>),
      duplicate: true,
    };
  }

  const connection = await NetworkConnectionModel.create({
    _id: randomUUID(),
    universityId:
      actor.universityId ??
      (typeof receiver.universityId === "string" ? receiver.universityId : null),
    requesterId: actor.id,
    receiverId: payload.receiverId,
    status: "PENDING",
    metadata: { message: payload.message ?? null },
  });

  await Promise.all([
    createSystemNotification({
      target: { recipientId: payload.receiverId },
      senderId: actor.id,
      type: "SYSTEM",
      title: "New connection request",
      message: "You received a new professional connection request.",
      entityType: "network_connection",
      entityId: String(connection._id),
      actionUrl: "/network",
      priority: "NORMAL",
      metadata: { requesterId: actor.id },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId:
        typeof connection.universityId === "string"
          ? connection.universityId
          : null,
      action: "NETWORK_CONNECTION_REQUESTED",
      entityType: "network_connection",
      entityId: String(connection._id),
      after: serializeConnection(connection.toObject()),
    }),
  ]);

  return {
    connection: serializeConnection(connection.toObject()),
    duplicate: false,
  };
}

export async function listConnections(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadNetwork(actor)) throw forbidden("Network read access is required.");
  await connectMongo();

  const filters = networkConnectionQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {};
  const universityId = resolveUniversityScope(actor, filters.universityId);
  if (universityId) dbFilter.universityId = universityId;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  if (!canModerateNetwork(actor)) {
    if (filters.role === "REQUESTER") dbFilter.requesterId = actor.id;
    else if (filters.role === "RECEIVER") dbFilter.receiverId = actor.id;
    else dbFilter.$or = [{ requesterId: actor.id }, { receiverId: actor.id }];
  }

  const connections = await NetworkConnectionModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return connections.map((connection) =>
    serializeConnection(connection as Record<string, unknown>),
  );
}

export async function respondToConnection(connectionId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();

  const payload = networkConnectionResponseSchema.parse(input);
  const connection = await NetworkConnectionModel.findById(connectionId).lean();
  if (!connection) throw notFound("Network connection not found.");
  if (connection.receiverId !== actor.id && !canModerateNetwork(actor)) {
    throw forbidden("Only the receiver can respond to this connection.");
  }
  if (connection.status !== "PENDING") {
    throw forbidden("Only pending connections can be updated.");
  }

  const updated = await NetworkConnectionModel.findOneAndUpdate(
    { _id: connectionId, status: "PENDING" },
    {
      $set: {
        status: payload.status,
        respondedAt: new Date(),
        respondedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Network connection not found.");

  await Promise.all([
    createSystemNotification({
      target: { recipientId: String(connection.requesterId) },
      senderId: actor.id,
      type: "SYSTEM",
      title: "Connection request updated",
      message: `Your connection request was ${payload.status.toLowerCase()}.`,
      entityType: "network_connection",
      entityId: connectionId,
      actionUrl: "/network",
      priority: payload.status === "ACCEPTED" ? "HIGH" : "NORMAL",
      metadata: { status: payload.status },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId:
        typeof connection.universityId === "string"
          ? connection.universityId
          : actor.universityId ?? null,
      action:
        payload.status === "BLOCKED"
          ? "NETWORK_CONNECTION_BLOCKED"
          : "NETWORK_CONNECTION_RESPONDED",
      entityType: "network_connection",
      entityId: connectionId,
      before: serializeConnection(connection as Record<string, unknown>),
      after: serializeConnection(updated as Record<string, unknown>),
    }),
  ]);

  return serializeConnection(updated as Record<string, unknown>);
}

export async function followEntity(input: unknown) {
  const actor = await requireAuth();
  if (!canFollow(actor)) throw forbidden("Network follow access is required.");
  await connectMongo();

  const payload = createNetworkFollowSchema.parse(input);
  if (payload.entityType === "USER" && payload.entityId === actor.id) {
    throw forbidden("You cannot follow yourself.");
  }
  const target = await resolveFollowTarget({
    actor,
    entityType: payload.entityType,
    entityId: payload.entityId,
  });
  if (
    target.universityId &&
    actor.universityId &&
    payload.entityType !== "UNIVERSITY" &&
    target.universityId !== actor.universityId &&
    !canModerateNetwork(actor)
  ) {
    throw forbidden("Cannot follow this resource outside your university.");
  }

  const id = `follow:${actor.id}:${payload.entityType}:${payload.entityId}`;
  let follow;
  try {
    follow = await NetworkFollowModel.create({
      _id: id,
      universityId: target.universityId,
      followerId: actor.id,
      entityType: payload.entityType,
      entityId: payload.entityId,
      status: "ACTIVE",
      metadata: payload.metadata ?? null,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      const existing = await NetworkFollowModel.findOneAndUpdate(
        { followerId: actor.id, entityType: payload.entityType, entityId: payload.entityId },
        { $set: { status: "ACTIVE", metadata: payload.metadata ?? null } },
        { new: true },
      ).lean();

      return {
        follow: existing
          ? serializeFollow(existing as Record<string, unknown>)
          : null,
        duplicate: true,
      };
    }

    throw error;
  }

  await Promise.all([
    target.ownerId && target.ownerId !== actor.id
      ? createSystemNotification({
          target: { recipientId: target.ownerId },
          senderId: actor.id,
          type: "SYSTEM",
          title: "New follower",
          message: `Someone followed your ${payload.entityType.toLowerCase()}.`,
          entityType: "network_follow",
          entityId: String(follow._id),
          actionUrl: "/network",
          priority: "LOW",
          metadata: {
            entityType: payload.entityType,
            entityId: payload.entityId,
          },
        })
      : Promise.resolve(),
    writeAuditLog({
      actorId: actor.id,
      universityId: target.universityId,
      action: "NETWORK_FOLLOWED",
      entityType: "network_follow",
      entityId: String(follow._id),
      after: serializeFollow(follow.toObject()),
    }),
  ]);

  return {
    follow: serializeFollow(follow.toObject()),
    duplicate: false,
  };
}

export async function listFollows(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadNetwork(actor)) throw forbidden("Network read access is required.");
  await connectMongo();

  const filters = networkFollowQuerySchema.parse(query);
  const universityId = resolveUniversityScope(actor, filters.universityId);
  const dbFilter: Record<string, unknown> = { followerId: actor.id };
  if (universityId) dbFilter.universityId = universityId;
  if (filters.entityType) dbFilter.entityType = filters.entityType;
  if (filters.entityId) dbFilter.entityId = filters.entityId;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const follows = await NetworkFollowModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return follows.map((follow) =>
    serializeFollow(follow as Record<string, unknown>),
  );
}

export async function unfollowEntity(
  entityType: NetworkFollowEntityType,
  entityId: string,
) {
  const actor = await requireAuth();
  await connectMongo();

  const follow = await NetworkFollowModel.findOneAndDelete({
    followerId: actor.id,
    entityType,
    entityId,
  }).lean();
  if (!follow) return { unfollowed: false };

  await writeAuditLog({
    actorId: actor.id,
    universityId:
      typeof follow.universityId === "string"
        ? follow.universityId
        : actor.universityId ?? null,
    action: "NETWORK_UNFOLLOWED",
    entityType: "network_follow",
    entityId: String(follow._id),
    before: serializeFollow(follow as Record<string, unknown>),
  });

  return { unfollowed: true };
}
