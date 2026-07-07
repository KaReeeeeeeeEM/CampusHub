import { randomBytes, randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  assignCommunityModeratorSchema,
  communityQuerySchema,
  communityUpdateQuerySchema,
  createCommunityEventSchema,
  createCommunityPollSchema,
  createCommunitySchema,
  createCommunityUpdateSchema,
  updateCommunitySchema,
} from "@/features/communities/lib/community-schemas";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  CommunityMemberModel,
  CommunityModel,
  CommunityUpdateModel,
  EventModel,
  PollModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function generateQrCode() {
  return `event_${randomBytes(32).toString("base64url")}`;
}

function canCreateCommunity(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.COMMUNITY_CREATE) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function canReadCommunity(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.COMMUNITY_READ) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function canModerateCommunities(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.COMMUNITY_MODERATE)
  );
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) throw forbidden("University scope is required.");

  return actor.universityId;
}

function serializeCommunity(community: Record<string, unknown>) {
  return {
    id: String(community._id),
    name: String(community.name),
    slug: String(community.slug),
    description:
      typeof community.description === "string" ? community.description : null,
    coverImage:
      typeof community.coverImage === "string" ? community.coverImage : null,
    visibility: String(community.visibility ?? "UNIVERSITY"),
    ownerId: String(community.ownerId),
    universityId: String(community.universityId),
    memberCount: Number(community.memberCount ?? 0),
    moderatorCount: Number(community.moderatorCount ?? 0),
    status: String(community.status ?? "ACTIVE"),
    createdAt: serializeDate(community.createdAt),
    updatedAt: serializeDate(community.updatedAt),
  };
}

function serializeMember(member: Record<string, unknown>) {
  return {
    id: String(member._id),
    communityId: String(member.communityId),
    universityId: String(member.universityId),
    userId: String(member.userId),
    role: String(member.role ?? "MEMBER"),
    status: String(member.status ?? "ACTIVE"),
    joinedAt: serializeDate(member.joinedAt),
    leftAt: serializeDate(member.leftAt),
    createdAt: serializeDate(member.createdAt),
    updatedAt: serializeDate(member.updatedAt),
  };
}

function serializeUpdate(update: Record<string, unknown>) {
  return {
    id: String(update._id),
    communityId: String(update.communityId),
    universityId: String(update.universityId),
    authorId: String(update.authorId),
    title: String(update.title),
    content: String(update.content),
    attachments: Array.isArray(update.attachments) ? update.attachments : [],
    status: String(update.status ?? "PUBLISHED"),
    createdAt: serializeDate(update.createdAt),
    updatedAt: serializeDate(update.updatedAt),
  };
}

function serializeEvent(event: Record<string, unknown>) {
  return {
    id: String(event._id),
    universityId: String(event.universityId),
    title: String(event.title),
    description: typeof event.description === "string" ? event.description : null,
    eventType: String(event.eventType),
    organizerId: String(event.organizerId),
    venue: String(event.venue),
    startDate: serializeDate(event.startDate),
    endDate: serializeDate(event.endDate),
    registrationDeadline: serializeDate(event.registrationDeadline),
    capacity: typeof event.capacity === "number" ? Number(event.capacity) : null,
    status: String(event.status),
    visibility: String(event.visibility),
    metadata: event.metadata ?? null,
    createdAt: serializeDate(event.createdAt),
    updatedAt: serializeDate(event.updatedAt),
  };
}

function serializePoll(poll: Record<string, unknown>) {
  const options = Array.isArray(poll.options)
    ? poll.options.map((option) => {
        const record = option as Record<string, unknown>;
        return {
          id: String(record.optionId),
          label: String(record.label),
          voteCount: Number(record.voteCount ?? 0),
        };
      })
    : [];

  return {
    id: String(poll._id),
    universityId: String(poll.universityId),
    creatorId: String(poll.creatorId),
    title: String(poll.title),
    description: typeof poll.description === "string" ? poll.description : null,
    pollType: String(poll.pollType),
    options,
    visibility: String(poll.visibility),
    status: String(poll.status),
    metadata: poll.metadata ?? null,
    createdAt: serializeDate(poll.createdAt),
    updatedAt: serializeDate(poll.updatedAt),
  };
}

async function uniqueCommunitySlug(universityId: string, name: string) {
  const base = slugify(name) || "community";
  let candidate = base;
  let suffix = 2;

  while (
    await CommunityModel.exists({
      universityId,
      slug: candidate,
      ...deletedFilter,
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function getCommunityOrThrow(communityId: string) {
  const community = await CommunityModel.findOne({
    _id: communityId,
    ...deletedFilter,
  }).lean();
  if (!community) throw notFound("Community not found.");

  return community;
}

async function getMembership(communityId: string, userId: string) {
  return CommunityMemberModel.findOne({
    communityId,
    userId,
    status: "ACTIVE",
  }).lean();
}

async function assertCommunityVisible(
  actor: AuthUser,
  community: Record<string, unknown>,
) {
  if (canModerateCommunities(actor) || community.ownerId === actor.id) return;
  if (community.status !== "ACTIVE") throw notFound("Community not found.");
  if (community.visibility === "PUBLIC") return;
  if (
    community.visibility === "UNIVERSITY" &&
    actor.universityId &&
    community.universityId === actor.universityId
  ) {
    return;
  }

  const membership = await getMembership(String(community._id), actor.id);
  if (membership) return;

  throw notFound("Community not found.");
}

async function assertCanManageCommunity(
  actor: AuthUser,
  community: Record<string, unknown>,
) {
  if (canModerateCommunities(actor) || community.ownerId === actor.id) return;

  const membership = await getMembership(String(community._id), actor.id);
  if (membership?.role === "MODERATOR" || membership?.role === "OWNER") return;

  throw forbidden("Community moderator access is required.");
}

async function notifyCommunityMembers(input: {
  communityId: string;
  universityId: string;
  senderId: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
}) {
  const members = await CommunityMemberModel.find({
    communityId: input.communityId,
    status: "ACTIVE",
    userId: { $ne: input.senderId },
  })
    .select("userId")
    .limit(500)
    .lean();
  const recipientIds = members.map((member) => String(member.userId));
  if (!recipientIds.length) return;

  await createSystemNotification({
    target: { recipientIds },
    senderId: input.senderId,
    type: "SYSTEM",
    title: input.title,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    actionUrl: `/communities/${input.communityId}`,
    priority: "NORMAL",
    metadata: {
      communityId: input.communityId,
      universityId: input.universityId,
    },
  });
}

export async function createCommunity(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateCommunity(actor)) {
    throw forbidden("Community creation access is required.");
  }
  const universityId = assertUniversityScope(actor);
  await connectPostgres();

  const payload = createCommunitySchema.parse(input);
  const community = await CommunityModel.create({
    _id: randomUUID(),
    name: payload.name,
    slug: await uniqueCommunitySlug(universityId, payload.name),
    description: payload.description ?? null,
    coverImage: payload.coverImage ?? null,
    visibility: payload.visibility,
    ownerId: actor.id,
    universityId,
    memberCount: 1,
    status: "ACTIVE",
    createdById: actor.id,
  });
  await CommunityMemberModel.create({
    _id: randomUUID(),
    communityId: String(community._id),
    universityId,
    userId: actor.id,
    role: "OWNER",
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "COMMUNITY_CREATED",
    entityType: "community",
    entityId: String(community._id),
    after: serializeCommunity(community.toObject()),
  });

  return serializeCommunity(community.toObject());
}

export async function listCommunities(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadCommunity(actor)) throw forbidden("Community read access is required.");
  await connectPostgres();

  const filters = communityQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    status: filters.status ?? "ACTIVE",
    ...deletedFilter,
  };
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };
  if (filters.q) dbFilter.$text = { $search: filters.q };

  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    if (filters.universityId) dbFilter.universityId = filters.universityId;
  } else if (actor.universityId) {
    dbFilter.$or = [
      { visibility: "PUBLIC" },
      { visibility: "UNIVERSITY", universityId: actor.universityId },
      { ownerId: actor.id },
    ];
  }

  if (filters.mine) {
    const memberships = await CommunityMemberModel.find({
      userId: actor.id,
      status: "ACTIVE",
    })
      .select("communityId")
      .lean();
    dbFilter._id = { $in: memberships.map((item) => String(item.communityId)) };
    delete dbFilter.$or;
  }

  const communities = await CommunityModel.find(dbFilter)
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return communities.map((community) =>
    serializeCommunity(community as Record<string, unknown>),
  );
}

export async function getCommunity(communityId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  await assertCommunityVisible(actor, community as Record<string, unknown>);

  return serializeCommunity(community as Record<string, unknown>);
}

export async function updateCommunity(communityId: string, input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  await assertCanManageCommunity(actor, community as Record<string, unknown>);

  const payload = updateCommunitySchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };
  if (payload.name !== undefined) update.name = payload.name;
  if (payload.description !== undefined)
    update.description = payload.description ?? null;
  if (payload.coverImage !== undefined)
    update.coverImage = payload.coverImage ?? null;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.status !== undefined) update.status = payload.status;

  const updated = await CommunityModel.findOneAndUpdate(
    { _id: communityId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Community not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(community.universityId),
    action: "COMMUNITY_UPDATED",
    entityType: "community",
    entityId: communityId,
    before: serializeCommunity(community as Record<string, unknown>),
    after: serializeCommunity(updated as Record<string, unknown>),
  });

  return serializeCommunity(updated as Record<string, unknown>);
}

export async function joinCommunity(communityId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  if (community.status !== "ACTIVE") throw forbidden("Community is not active.");
  if (
    community.visibility === "UNIVERSITY" &&
    actor.universityId !== community.universityId
  ) {
    throw forbidden("Cannot join another university's community.");
  }

  const status = community.visibility === "PRIVATE" ? "PENDING" : "ACTIVE";
  const existing = await CommunityMemberModel.findOneAndUpdate(
    { communityId, userId: actor.id },
    {
      $set: {
        universityId: community.universityId,
        status,
        leftAt: null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        role: "MEMBER",
        joinedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  ).lean();

  if (status === "ACTIVE") {
    await CommunityModel.updateOne(
      { _id: communityId },
      { $inc: { memberCount: 1 } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(community.universityId),
    action: "COMMUNITY_JOINED",
    entityType: "community",
    entityId: communityId,
    after: serializeMember(existing as Record<string, unknown>),
  });

  return serializeMember(existing as Record<string, unknown>);
}

export async function leaveCommunity(communityId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const membership = await CommunityMemberModel.findOne({
    communityId,
    userId: actor.id,
    status: "ACTIVE",
  }).lean();
  if (!membership) throw notFound("Community membership not found.");
  if (membership.role === "OWNER") {
    throw forbidden("Community owner cannot leave the community.");
  }

  const updated = await CommunityMemberModel.findOneAndUpdate(
    { _id: membership._id },
    { $set: { status: "LEFT", leftAt: new Date() } },
    { new: true },
  ).lean();
  await CommunityModel.updateOne(
    { _id: communityId, memberCount: { $gt: 0 } },
    { $inc: { memberCount: -1 } },
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(membership.universityId),
    action: "COMMUNITY_LEFT",
    entityType: "community",
    entityId: communityId,
    before: serializeMember(membership as Record<string, unknown>),
    after: updated ? serializeMember(updated as Record<string, unknown>) : null,
  });

  return { left: true };
}

export async function assignCommunityModerator(
  communityId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  if (community.ownerId !== actor.id && !canModerateCommunities(actor)) {
    throw forbidden("Only community owners can assign moderators.");
  }

  const payload = assignCommunityModeratorSchema.parse(input);
  const user = await UserModel.findOne({
    _id: payload.userId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!user) throw notFound("User not found.");
  if (user.universityId && user.universityId !== community.universityId) {
    throw forbidden("Cannot assign a moderator from another university.");
  }

  const previous = await CommunityMemberModel.findOne({
    communityId,
    userId: payload.userId,
  }).lean();
  const member = await CommunityMemberModel.findOneAndUpdate(
    { communityId, userId: payload.userId },
    {
      $set: {
        universityId: community.universityId,
        role: "MODERATOR",
        status: "ACTIVE",
        leftAt: null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        joinedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  ).lean();
  if (!previous || previous.status !== "ACTIVE") {
    await CommunityModel.updateOne(
      { _id: communityId },
      { $inc: { memberCount: 1 } },
    );
  }
  if (previous?.role !== "MODERATOR") {
    await CommunityModel.updateOne(
      { _id: communityId },
      { $inc: { moderatorCount: 1 } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(community.universityId),
    action: "COMMUNITY_MODERATOR_ASSIGNED",
    entityType: "community_member",
    entityId: String(member?._id ?? payload.userId),
    before: previous ? serializeMember(previous as Record<string, unknown>) : null,
    after: member ? serializeMember(member as Record<string, unknown>) : null,
  });

  return serializeMember(member as Record<string, unknown>);
}

export async function postCommunityUpdate(
  communityId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  await assertCanManageCommunity(actor, community as Record<string, unknown>);
  const payload = createCommunityUpdateSchema.parse(input);

  const update = await CommunityUpdateModel.create({
    _id: randomUUID(),
    communityId,
    universityId: community.universityId,
    authorId: actor.id,
    title: payload.title,
    content: payload.content,
    attachments: payload.attachments,
    status: "PUBLISHED",
    createdById: actor.id,
  });

  await Promise.all([
    notifyCommunityMembers({
      communityId,
      universityId: String(community.universityId),
      senderId: actor.id,
      title: "New community update",
      message: `${String(community.name)} posted a new update.`,
      entityType: "community_update",
      entityId: String(update._id),
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(community.universityId),
      action: "COMMUNITY_UPDATE_POSTED",
      entityType: "community_update",
      entityId: String(update._id),
      after: serializeUpdate(update.toObject()),
    }),
  ]);

  return serializeUpdate(update.toObject());
}

export async function listCommunityUpdates(
  communityId: string,
  query: unknown = {},
) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  await assertCommunityVisible(actor, community as Record<string, unknown>);
  const filters = communityUpdateQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    communityId,
    status: "PUBLISHED",
    ...deletedFilter,
  };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const updates = await CommunityUpdateModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return updates.map((update) =>
    serializeUpdate(update as Record<string, unknown>),
  );
}

function normalizePollOptions(
  options: Array<string | { id?: string; label: string }>,
) {
  return options.map((option) => {
    if (typeof option === "string") {
      return { optionId: randomUUID(), label: option, voteCount: 0 };
    }

    return {
      optionId: option.id ?? randomUUID(),
      label: option.label,
      voteCount: 0,
    };
  });
}

export async function createCommunityEvent(
  communityId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  await assertCanManageCommunity(actor, community as Record<string, unknown>);
  const payload = createCommunityEventSchema.parse(input);

  const event = await EventModel.create({
    _id: randomUUID(),
    universityId: community.universityId,
    title: payload.title,
    description: payload.description ?? null,
    eventType: payload.eventType,
    organizerId: actor.id,
    venue: payload.venue,
    startDate: payload.startDate,
    endDate: payload.endDate,
    startAt: payload.startDate,
    endAt: payload.endDate,
    registrationDeadline: payload.registrationDeadline ?? null,
    registrationRequired: true,
    capacity: payload.capacity ?? null,
    allowWaitlist: payload.allowWaitlist,
    bannerImage: payload.bannerImage ?? null,
    attachments: payload.attachments,
    qrCode: generateQrCode(),
    visibility:
      community.visibility === "PUBLIC" ? "ALL_USERS" : "SPECIFIC_COLLEGES",
    collegeIds: [],
    departmentIds: [],
    status: payload.status,
    metadata: {
      communityId,
      source: "COMMUNITY",
    },
    createdById: actor.id,
  });

  await Promise.all([
    notifyCommunityMembers({
      communityId,
      universityId: String(community.universityId),
      senderId: actor.id,
      title: "New community event",
      message: `${String(community.name)} created a new event.`,
      entityType: "event",
      entityId: String(event._id),
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(community.universityId),
      action: "COMMUNITY_EVENT_CREATED",
      entityType: "event",
      entityId: String(event._id),
      after: serializeEvent(event.toObject()),
    }),
  ]);

  return serializeEvent(event.toObject());
}

export async function createCommunityPoll(
  communityId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const community = await getCommunityOrThrow(communityId);
  await assertCanManageCommunity(actor, community as Record<string, unknown>);
  const payload = createCommunityPollSchema.parse(input);

  const poll = await PollModel.create({
    _id: randomUUID(),
    universityId: community.universityId,
    createdById: actor.id,
    creatorId: actor.id,
    title: payload.title,
    description: payload.description ?? null,
    pollType: payload.pollType,
    options: normalizePollOptions(payload.options),
    visibility: "CUSTOM",
    customAudience: [],
    allowMultiple: payload.allowMultipleSelection,
    allowMultipleSelection: payload.allowMultipleSelection,
    anonymous: payload.anonymous,
    startsAt: payload.startDate ?? null,
    startDate: payload.startDate ?? null,
    endsAt: payload.endDate,
    endDate: payload.endDate,
    status: payload.status,
    metadata: {
      communityId,
      source: "COMMUNITY",
    },
  });

  await Promise.all([
    notifyCommunityMembers({
      communityId,
      universityId: String(community.universityId),
      senderId: actor.id,
      title: "New community poll",
      message: `${String(community.name)} created a new poll.`,
      entityType: "poll",
      entityId: String(poll._id),
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(community.universityId),
      action: "COMMUNITY_POLL_CREATED",
      entityType: "poll",
      entityId: String(poll._id),
      after: serializePoll(poll.toObject()),
    }),
  ]);

  return serializePoll(poll.toObject());
}
