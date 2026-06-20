import { randomBytes, randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  assignCommitteeMemberSchema,
  committeeAnalyticsQuerySchema,
  committeeQuerySchema,
  completeCommitteeMeetingSchema,
  createCommitteeAnnouncementSchema,
  createCommitteeCommunitySchema,
  createCommitteeEventSchema,
  createCommitteeMeetingSchema,
  createCommitteePollSchema,
  createCommitteeReportSchema,
  createCommitteeSchema,
  createCommitteeSuggestionSchema,
  transferCommitteeRoleSchema,
} from "@/features/committees/lib/committee-schemas";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AnnouncementModel,
  CollegeModel,
  CommitteeMeetingModel,
  CommitteeMemberModel,
  CommitteeModel,
  CommitteeReportModel,
  CommunityMemberModel,
  CommunityModel,
  DepartmentModel,
  EventModel,
  PollModel,
  SuggestionModel,
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
    .slice(0, 100);
}

function generateQrCode() {
  return `committee_event_${randomBytes(32).toString("base64url")}`;
}

function normalizeCommitteeRole(role: unknown) {
  if (role === "CHAIR") return "CHAIRPERSON";
  if (role === "TREASURER") return "MEMBER";
  if (
    role === "CHAIRPERSON" ||
    role === "VICE_CHAIRPERSON" ||
    role === "SECRETARY" ||
    role === "MEMBER"
  ) {
    return role;
  }

  return "MEMBER";
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageCommittees(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE) ||
    hasPermission(actor, PERMISSIONS.USER_ASSIGN_POSITION)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (isSuperAdmin(actor)) return requested ?? actor.universityId ?? null;
  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot access another university's committees.");
  }

  return actor.universityId;
}

function serializeCommittee(committee: Record<string, unknown>) {
  return {
    id: String(committee._id),
    universityId: String(committee.universityId),
    collegeId: typeof committee.collegeId === "string" ? committee.collegeId : null,
    departmentId:
      typeof committee.departmentId === "string" ? committee.departmentId : null,
    name: String(committee.name),
    slug: String(committee.slug),
    description:
      typeof committee.description === "string" ? committee.description : null,
    scopeType: String(committee.scopeType),
    category: String(committee.category ?? committee.committeeType ?? "GENERAL"),
    committeeType: String(committee.committeeType ?? committee.category ?? "GENERAL"),
    chairpersonId:
      typeof committee.chairpersonId === "string"
        ? committee.chairpersonId
        : typeof committee.chairUserId === "string"
          ? committee.chairUserId
          : null,
    viceChairpersonId:
      typeof committee.viceChairpersonId === "string"
        ? committee.viceChairpersonId
        : null,
    secretaryId:
      typeof committee.secretaryId === "string" ? committee.secretaryId : null,
    chairUserId:
      typeof committee.chairUserId === "string" ? committee.chairUserId : null,
    memberCount: Number(committee.memberCount ?? 0),
    status: String(committee.status ?? "ACTIVE"),
    metadata: committee.metadata ?? null,
    createdAt: serializeDate(committee.createdAt),
    updatedAt: serializeDate(committee.updatedAt),
  };
}

function serializeMember(member: Record<string, unknown>) {
  return {
    id: String(member._id),
    committeeId: String(member.committeeId),
    universityId: String(member.universityId),
    userId: String(member.userId),
    role: normalizeCommitteeRole(member.role),
    status: String(member.status ?? "ACTIVE"),
    joinedAt: serializeDate(member.joinedAt),
    leftAt: serializeDate(member.leftAt),
    metadata: member.metadata ?? null,
  };
}

function serializeReport(report: Record<string, unknown>) {
  return {
    id: String(report._id),
    committeeId: String(report.committeeId),
    universityId: String(report.universityId),
    authoredById: String(report.authoredById),
    title: String(report.title),
    summary: typeof report.summary === "string" ? report.summary : null,
    content: String(report.content),
    attachments: Array.isArray(report.attachments) ? report.attachments : [],
    status: String(report.status ?? "DRAFT"),
    submittedAt: serializeDate(report.submittedAt),
    approvedById:
      typeof report.approvedById === "string" ? report.approvedById : null,
    approvedAt: serializeDate(report.approvedAt),
    metadata: report.metadata ?? null,
    createdAt: serializeDate(report.createdAt),
    updatedAt: serializeDate(report.updatedAt),
  };
}

function serializeMeeting(meeting: Record<string, unknown>) {
  return {
    id: String(meeting._id),
    committeeId: String(meeting.committeeId),
    universityId: String(meeting.universityId),
    scheduledById: String(meeting.scheduledById),
    title: String(meeting.title),
    agenda: Array.isArray(meeting.agenda) ? meeting.agenda.map(String) : [],
    minutes: typeof meeting.minutes === "string" ? meeting.minutes : null,
    decisions: Array.isArray(meeting.decisions)
      ? meeting.decisions.map(String)
      : [],
    attendeeIds: Array.isArray(meeting.attendeeIds)
      ? meeting.attendeeIds.map(String)
      : [],
    scheduledAt: serializeDate(meeting.scheduledAt),
    endedAt: serializeDate(meeting.endedAt),
    status: String(meeting.status ?? "SCHEDULED"),
    metadata: meeting.metadata ?? null,
    createdAt: serializeDate(meeting.createdAt),
    updatedAt: serializeDate(meeting.updatedAt),
  };
}

async function assertCollegeScope(universityId: string, collegeId?: string | null) {
  if (!collegeId) return;
  const college = await CollegeModel.exists({
    _id: collegeId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  });
  if (!college) throw forbidden("College must belong to the university.");
}

async function assertDepartmentScope(
  universityId: string,
  collegeId?: string | null,
  departmentId?: string | null,
) {
  if (!departmentId) return;
  const department = await DepartmentModel.findOne({
    _id: departmentId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!department) throw forbidden("Department must belong to the university.");
  if (collegeId && department.collegeId !== collegeId) {
    throw forbidden("Department must belong to the selected college.");
  }
}

async function uniqueCommitteeSlug(universityId: string, name: string) {
  const base = slugify(name) || "committee";
  let candidate = base;
  let suffix = 2;

  while (await CommitteeModel.exists({ universityId, slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function uniqueCommunitySlug(universityId: string, name: string) {
  const base = slugify(name) || "community";
  let candidate = base;
  let suffix = 2;

  while (await CommunityModel.exists({ universityId, slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function getCommitteeOrThrow(committeeId: string) {
  const committee = await CommitteeModel.findOne({
    _id: committeeId,
    ...deletedFilter,
  }).lean();
  if (!committee) throw notFound("Committee not found.");

  return committee as Record<string, unknown>;
}

async function getCommitteeMembership(committeeId: string, userId: string) {
  return CommitteeMemberModel.findOne({
    committeeId,
    userId,
    status: "ACTIVE",
  }).lean();
}

async function assertCanAccessCommittee(
  actor: AuthUser,
  committee: Record<string, unknown>,
) {
  if (canManageCommittees(actor)) return;
  if (actor.universityId !== committee.universityId) {
    throw notFound("Committee not found.");
  }
  const membership = await getCommitteeMembership(String(committee._id), actor.id);
  if (membership) return;

  throw forbidden("Committee membership is required.");
}

async function assertCanManageCommittee(
  actor: AuthUser,
  committee: Record<string, unknown>,
) {
  if (canManageCommittees(actor)) return;
  const membership = await getCommitteeMembership(String(committee._id), actor.id);
  const role = normalizeCommitteeRole(membership?.role);
  if (
    role === "CHAIRPERSON" ||
    role === "VICE_CHAIRPERSON" ||
    role === "SECRETARY"
  ) {
    return;
  }

  throw forbidden("Committee officer access is required.");
}

function officerFieldForRole(role: string) {
  if (role === "CHAIRPERSON") return "chairpersonId";
  if (role === "VICE_CHAIRPERSON") return "viceChairpersonId";
  if (role === "SECRETARY") return "secretaryId";

  return null;
}

async function syncCommitteeOfficerRole(input: {
  committeeId: string;
  userId: string;
  role: string;
}) {
  const officerField = officerFieldForRole(input.role);
  if (!officerField) return;

  await CommitteeMemberModel.updateMany(
    {
      committeeId: input.committeeId,
      userId: { $ne: input.userId },
      role: input.role,
      status: "ACTIVE",
    },
    { $set: { role: "MEMBER" } },
  );

  await CommitteeModel.updateOne(
    { _id: input.committeeId },
    {
      $set: {
        [officerField]: input.userId,
        ...(input.role === "CHAIRPERSON" ? { chairUserId: input.userId } : {}),
      },
    },
  );
}

async function notifyCommitteeMembers(input: {
  committeeId: string;
  universityId: string;
  senderId: string;
  title: string;
  message: string;
  entityType: string;
  entityId: string;
}) {
  const members = await CommitteeMemberModel.find({
    committeeId: input.committeeId,
    status: "ACTIVE",
    userId: { $ne: input.senderId },
  }).select("userId").lean();

  const recipientIds = members.map((member) => String(member.userId));
  if (!recipientIds.length) return;

  await createSystemNotification({
    target: {
      recipientIds,
      universityId: input.universityId,
    },
    senderId: input.senderId,
    type: "SYSTEM",
    title: input.title,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    priority: "NORMAL",
    metadata: {
      committeeId: input.committeeId,
    },
  });
}

export async function createCommittee(input: unknown) {
  const actor = await requireAuth();
  if (!canManageCommittees(actor)) {
    throw forbidden("Committee management access is required.");
  }

  await connectMongo();
  const payload = createCommitteeSchema.parse(input);
  const universityId = scopedUniversityId(actor, payload.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  await assertCollegeScope(universityId, payload.collegeId);
  await assertDepartmentScope(
    universityId,
    payload.collegeId,
    payload.departmentId,
  );
  const chairpersonId = payload.chairpersonId ?? payload.chairUserId ?? null;
  const officerIds = [
    chairpersonId,
    payload.viceChairpersonId,
    payload.secretaryId,
  ].filter(Boolean) as string[];
  if (officerIds.length) {
    const activeOfficerCount = await UserModel.countDocuments({
      _id: { $in: officerIds },
      universityId,
      status: "ACTIVE",
      ...deletedFilter,
    });
    if (activeOfficerCount !== new Set(officerIds).size) {
      throw forbidden("Committee officers must be active in the university.");
    }
  }

  const committee = await CommitteeModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: payload.collegeId ?? null,
    departmentId: payload.departmentId ?? null,
    name: payload.name,
    slug: await uniqueCommitteeSlug(universityId, payload.name),
    description: payload.description ?? null,
    scopeType: payload.scopeType,
    category: payload.category ?? payload.committeeType,
    committeeType: payload.category ?? payload.committeeType,
    chairpersonId,
    viceChairpersonId: payload.viceChairpersonId ?? null,
    secretaryId: payload.secretaryId ?? null,
    chairUserId: chairpersonId,
    memberCount: new Set(officerIds).size,
    status: "ACTIVE",
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  const initialMembers = [
    chairpersonId ? { userId: chairpersonId, role: "CHAIRPERSON" } : null,
    payload.viceChairpersonId
      ? { userId: payload.viceChairpersonId, role: "VICE_CHAIRPERSON" }
      : null,
    payload.secretaryId ? { userId: payload.secretaryId, role: "SECRETARY" } : null,
  ].filter(Boolean) as Array<{ userId: string; role: string }>;

  for (const initialMember of initialMembers) {
    await CommitteeMemberModel.findOneAndUpdate(
      { committeeId: String(committee._id), userId: initialMember.userId },
      {
        $set: {
          universityId,
          collegeId: payload.collegeId ?? null,
          departmentId: payload.departmentId ?? null,
          role: initialMember.role,
          status: "ACTIVE",
          leftAt: null,
          metadata: { autoAssignedOfficer: true },
        },
        $setOnInsert: {
          _id: randomUUID(),
          committeeId: String(committee._id),
          userId: initialMember.userId,
          joinedAt: new Date(),
        },
      },
      { upsert: true },
    );
    await UserModel.updateOne(
      { _id: initialMember.userId },
      {
        $set: {
          position: "COMMITTEE_MEMBER",
          updatedById: actor.id,
        },
        $addToSet: {
          studentLeadershipPositions: "COMMITTEE_MEMBER",
        },
      },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "COMMITTEE_CREATED",
    entityType: "committee",
    entityId: String(committee._id),
    after: serializeCommittee(committee.toObject()),
  });

  return serializeCommittee(committee.toObject());
}

export async function listCommittees(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = committeeQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  const dbFilter: Record<string, unknown> = {
    universityId,
    status: filters.status,
    ...deletedFilter,
  };
  if (filters.scopeType) dbFilter.scopeType = filters.scopeType;
  if (filters.category) dbFilter.category = filters.category;
  if (filters.committeeType) dbFilter.committeeType = filters.committeeType;
  if (filters.collegeId) dbFilter.collegeId = filters.collegeId;
  if (filters.departmentId) dbFilter.departmentId = filters.departmentId;
  if (filters.q) dbFilter.name = { $regex: filters.q, $options: "i" };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const committees = await CommitteeModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return committees.map((committee) =>
    serializeCommittee(committee as Record<string, unknown>),
  );
}

export async function assignCommitteeMember(committeeId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = assignCommitteeMemberSchema.parse(input);
  const user = await UserModel.findOne({
    _id: payload.userId,
    universityId: committee.universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();
  if (!user) throw forbidden("Committee member must be active in this university.");
  const role = normalizeCommitteeRole(payload.role);

  const existingMember = await CommitteeMemberModel.findOne({
    committeeId,
    userId: payload.userId,
  })
    .select("status")
    .lean();
  const member = await CommitteeMemberModel.findOneAndUpdate(
    { committeeId, userId: payload.userId },
    {
      $set: {
        universityId: committee.universityId,
        collegeId: committee.collegeId ?? null,
        departmentId: committee.departmentId ?? null,
        role,
        status: "ACTIVE",
        leftAt: null,
        metadata: payload.metadata ?? null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        committeeId,
        userId: payload.userId,
        joinedAt: new Date(),
      },
    },
    { new: true, upsert: true },
  ).lean();

  await CommitteeModel.updateOne(
    { _id: committeeId },
    {
      ...(!existingMember || existingMember.status !== "ACTIVE"
        ? { $inc: { memberCount: 1 } }
        : {}),
    },
  );
  await syncCommitteeOfficerRole({ committeeId, userId: payload.userId, role });
  await UserModel.updateOne(
    { _id: payload.userId },
    {
      $set: {
        position: "COMMITTEE_MEMBER",
        updatedById: actor.id,
      },
      $addToSet: {
        studentLeadershipPositions: "COMMITTEE_MEMBER",
      },
    },
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_MEMBER_ASSIGNED",
    entityType: "committee_member",
    entityId: String(member?._id),
    after: member ? serializeMember(member as Record<string, unknown>) : null,
  });

  return serializeMember(member as Record<string, unknown>);
}

export async function removeCommitteeMember(committeeId: string, memberId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const member = await CommitteeMemberModel.findOneAndUpdate(
    {
      _id: memberId,
      committeeId,
      status: "ACTIVE",
    },
    {
      $set: {
        status: "REMOVED",
        leftAt: new Date(),
      },
    },
    { new: true },
  ).lean();
  if (!member) throw notFound("Committee member not found.");

  const role = normalizeCommitteeRole(member.role);
  const officerField = officerFieldForRole(role);
  const unsetOfficer: Record<string, null> = {};
  if (officerField) unsetOfficer[officerField] = null;
  if (role === "CHAIRPERSON") unsetOfficer.chairUserId = null;
  await CommitteeModel.updateOne(
    { _id: committeeId, memberCount: { $gt: 0 } },
    {
      $inc: { memberCount: -1 },
      ...(Object.keys(unsetOfficer).length ? { $set: unsetOfficer } : {}),
    },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_MEMBER_REMOVED",
    entityType: "committee_member",
    entityId: memberId,
    after: serializeMember(member as Record<string, unknown>),
  });

  return serializeMember(member as Record<string, unknown>);
}

export async function transferCommitteeRole(committeeId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = transferCommitteeRoleSchema.parse(input);
  const role = normalizeCommitteeRole(payload.role);
  const user = await UserModel.exists({
    _id: payload.userId,
    universityId: committee.universityId,
    status: "ACTIVE",
    ...deletedFilter,
  });
  if (!user) throw forbidden("Committee role holder must be active in this university.");

  const existingMember = await CommitteeMemberModel.findOne({
    committeeId,
    userId: payload.userId,
  })
    .select("status")
    .lean();
  const member = await CommitteeMemberModel.findOneAndUpdate(
    { committeeId, userId: payload.userId },
    {
      $set: {
        universityId: committee.universityId,
        collegeId: committee.collegeId ?? null,
        departmentId: committee.departmentId ?? null,
        role,
        status: "ACTIVE",
        leftAt: null,
        metadata: payload.metadata ?? null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        committeeId,
        userId: payload.userId,
        joinedAt: new Date(),
      },
    },
    { new: true, upsert: true },
  ).lean();

  await syncCommitteeOfficerRole({ committeeId, userId: payload.userId, role });
  if (!existingMember || existingMember.status !== "ACTIVE") {
    await CommitteeModel.updateOne(
      { _id: committeeId },
      { $inc: { memberCount: 1 } },
    );
  }
  await UserModel.updateOne(
    { _id: payload.userId },
    {
      $set: {
        position: "COMMITTEE_MEMBER",
        updatedById: actor.id,
      },
      $addToSet: {
        studentLeadershipPositions: "COMMITTEE_MEMBER",
      },
    },
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_ROLE_TRANSFERRED",
    entityType: "committee_member",
    entityId: String(member?._id),
    after: member ? serializeMember(member as Record<string, unknown>) : null,
  });

  return serializeMember(member as Record<string, unknown>);
}

export async function listCommitteeMembers(committeeId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanAccessCommittee(actor, committee);
  const members = await CommitteeMemberModel.find({
    committeeId,
    status: "ACTIVE",
  })
    .sort({ role: 1, joinedAt: 1 })
    .lean();

  return members.map((member) => serializeMember(member as Record<string, unknown>));
}

export async function createCommitteeAnnouncement(
  committeeId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteeAnnouncementSchema.parse(input);
  const now = new Date();
  const announcement = await AnnouncementModel.create({
    _id: randomUUID(),
    universityId: committee.universityId,
    collegeId: committee.collegeId ?? null,
    departmentId: committee.departmentId ?? null,
    collegeIds: committee.collegeId ? [String(committee.collegeId)] : [],
    departmentIds: committee.departmentId ? [String(committee.departmentId)] : [],
    title: payload.title,
    slug: `${slugify(payload.title)}-${randomBytes(4).toString("hex")}`,
    content: payload.content,
    body: payload.content,
    summary: payload.summary ?? null,
    category: "LEADERSHIP",
    priority: payload.priority,
    visibility: "ALL_USERS",
    status: payload.status,
    publishedAt: payload.status === "PUBLISHED" ? now : null,
    attachments: payload.attachments,
    createdBy: actor.id,
    metadata: { committeeId },
    createdById: actor.id,
  });
  await notifyCommitteeMembers({
    committeeId,
    universityId: String(committee.universityId),
    senderId: actor.id,
    title: "Committee announcement",
    message: payload.title,
    entityType: "announcement",
    entityId: String(announcement._id),
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_ANNOUNCEMENT_CREATED",
    entityType: "announcement",
    entityId: String(announcement._id),
  });

  return { id: String(announcement._id) };
}

export async function createCommitteeEvent(committeeId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteeEventSchema.parse(input);
  const event = await EventModel.create({
    _id: randomUUID(),
    universityId: committee.universityId,
    collegeId: committee.collegeId ?? null,
    departmentId: committee.departmentId ?? null,
    collegeIds: committee.collegeId ? [String(committee.collegeId)] : [],
    departmentIds: committee.departmentId ? [String(committee.departmentId)] : [],
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
    capacity: payload.capacity ?? null,
    attachments: payload.attachments,
    qrCode: generateQrCode(),
    visibility: "ALL_USERS",
    status: "OPEN",
    metadata: { committeeId },
    createdById: actor.id,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_EVENT_CREATED",
    entityType: "event",
    entityId: String(event._id),
  });

  return { id: String(event._id) };
}

export async function createCommitteePoll(committeeId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteePollSchema.parse(input);
  const poll = await PollModel.create({
    _id: randomUUID(),
    universityId: committee.universityId,
    createdById: actor.id,
    creatorId: actor.id,
    title: payload.title,
    description: payload.description ?? null,
    pollType: payload.pollType,
    options: payload.options.map((label) => ({
      optionId: randomUUID(),
      label,
      voteCount: 0,
    })),
    visibility: "CUSTOM",
    collegeIds: committee.collegeId ? [String(committee.collegeId)] : [],
    departmentIds: committee.departmentId ? [String(committee.departmentId)] : [],
    customAudience: [],
    allowMultiple: payload.allowMultipleSelection,
    allowMultipleSelection: payload.allowMultipleSelection,
    anonymous: payload.anonymous,
    startsAt: new Date(),
    startDate: new Date(),
    endsAt: payload.endDate,
    endDate: payload.endDate,
    status: "ACTIVE",
    metadata: { committeeId },
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_POLL_CREATED",
    entityType: "poll",
    entityId: String(poll._id),
  });

  return { id: String(poll._id) };
}

export async function createCommitteeSuggestion(
  committeeId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteeSuggestionSchema.parse(input);
  const suggestion = await SuggestionModel.create({
    _id: randomUUID(),
    universityId: committee.universityId,
    createdById: actor.id,
    authorId: actor.id,
    category: payload.category,
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
    anonymous: payload.anonymous,
    attachments: payload.attachments,
    assignedToId: committee.secretaryId ?? committee.chairpersonId ?? null,
    assignedTo: committee.secretaryId ?? committee.chairpersonId ?? null,
    status: "OPEN",
    metadata: { committeeId },
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_SUGGESTION_CREATED",
    entityType: "suggestion",
    entityId: String(suggestion._id),
  });

  return { id: String(suggestion._id) };
}

export async function createCommitteeCommunity(
  committeeId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteeCommunitySchema.parse(input);
  const community = await CommunityModel.create({
    _id: randomUUID(),
    universityId: committee.universityId,
    name: payload.name,
    slug: await uniqueCommunitySlug(String(committee.universityId), payload.name),
    description: payload.description ?? null,
    coverImage: payload.coverImage ?? null,
    visibility: payload.visibility,
    ownerId: actor.id,
    memberCount: 1,
    moderatorCount: 0,
    status: "ACTIVE",
    metadata: { committeeId },
    createdById: actor.id,
  });
  await CommunityMemberModel.create({
    _id: randomUUID(),
    communityId: String(community._id),
    universityId: committee.universityId,
    userId: actor.id,
    role: "OWNER",
    status: "ACTIVE",
    metadata: { committeeId },
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_COMMUNITY_CREATED",
    entityType: "community",
    entityId: String(community._id),
  });

  return { id: String(community._id) };
}

export async function getCommitteeAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = committeeAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  const committeeFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (filters.committeeId) committeeFilter._id = filters.committeeId;
  if (filters.category) committeeFilter.category = filters.category;
  if (filters.status) committeeFilter.status = filters.status;

  const committeeIds = (
    await CommitteeModel.find(committeeFilter).select("_id").lean()
  ).map((committee) => String(committee._id));

  const metadataCommitteeFilter = filters.committeeId
    ? { "metadata.committeeId": filters.committeeId }
    : { "metadata.committeeId": { $in: committeeIds } };
  const committeeIdFilter = filters.committeeId
    ? { committeeId: filters.committeeId }
    : { committeeId: { $in: committeeIds } };

  const [
    totalCommittees,
    activeCommittees,
    totalMembers,
    roleCounts,
    categoryCounts,
    announcements,
    events,
    polls,
    suggestions,
    communities,
  ] = await Promise.all([
    CommitteeModel.countDocuments(committeeFilter),
    CommitteeModel.countDocuments({ ...committeeFilter, status: "ACTIVE" }),
    CommitteeMemberModel.countDocuments({ ...committeeIdFilter, status: "ACTIVE" }),
    CommitteeMemberModel.aggregate([
      { $match: { ...committeeIdFilter, status: "ACTIVE" } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CommitteeModel.aggregate([
      { $match: committeeFilter },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AnnouncementModel.countDocuments(metadataCommitteeFilter),
    EventModel.countDocuments(metadataCommitteeFilter),
    PollModel.countDocuments(metadataCommitteeFilter),
    SuggestionModel.countDocuments(metadataCommitteeFilter),
    CommunityModel.countDocuments(metadataCommitteeFilter),
  ]);

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "COMMITTEE_ANALYTICS_VIEWED",
    entityType: "committee",
    metadata: { filters },
  });

  return {
    totalCommittees,
    activeCommittees,
    totalMembers,
    byRole: roleCounts.map((item) => ({
      role: normalizeCommitteeRole(item._id),
      count: Number(item.count ?? 0),
    })),
    byCategory: categoryCounts.map((item) => ({
      category: String(item._id ?? "GENERAL"),
      count: Number(item.count ?? 0),
    })),
    integrations: {
      announcements,
      events,
      polls,
      suggestions,
      communities,
    },
  };
}

export async function createCommitteeReport(committeeId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteeReportSchema.parse(input);
  const report = await CommitteeReportModel.create({
    _id: randomUUID(),
    committeeId,
    universityId: committee.universityId,
    authoredById: actor.id,
    title: payload.title,
    summary: payload.summary ?? null,
    content: payload.content,
    attachments: payload.attachments,
    status: payload.status,
    submittedAt: payload.status === "SUBMITTED" ? new Date() : null,
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_REPORT_CREATED",
    entityType: "committee_report",
    entityId: String(report._id),
  });

  return serializeReport(report.toObject());
}

export async function listCommitteeReports(committeeId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanAccessCommittee(actor, committee);
  const reports = await CommitteeReportModel.find({ committeeId })
    .sort({ createdAt: -1 })
    .lean();

  return reports.map((report) => serializeReport(report as Record<string, unknown>));
}

export async function createCommitteeMeeting(committeeId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = createCommitteeMeetingSchema.parse(input);
  const meeting = await CommitteeMeetingModel.create({
    _id: randomUUID(),
    committeeId,
    universityId: committee.universityId,
    scheduledById: actor.id,
    title: payload.title,
    agenda: payload.agenda,
    attendeeIds: payload.attendeeIds,
    scheduledAt: payload.scheduledAt,
    status: "SCHEDULED",
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_MEETING_CREATED",
    entityType: "committee_meeting",
    entityId: String(meeting._id),
  });

  return serializeMeeting(meeting.toObject());
}

export async function completeCommitteeMeeting(
  committeeId: string,
  meetingId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanManageCommittee(actor, committee);
  const payload = completeCommitteeMeetingSchema.parse(input);
  const meeting = await CommitteeMeetingModel.findOneAndUpdate(
    { _id: meetingId, committeeId },
    {
      $set: {
        minutes: payload.minutes,
        decisions: payload.decisions,
        ...(payload.attendeeIds ? { attendeeIds: payload.attendeeIds } : {}),
        endedAt: payload.endedAt ?? new Date(),
        status: "COMPLETED",
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!meeting) throw notFound("Committee meeting not found.");
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_MEETING_COMPLETED",
    entityType: "committee_meeting",
    entityId: meetingId,
  });

  return serializeMeeting(meeting as Record<string, unknown>);
}

export async function listCommitteeMeetings(committeeId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const committee = await getCommitteeOrThrow(committeeId);
  await assertCanAccessCommittee(actor, committee);
  const meetings = await CommitteeMeetingModel.find({ committeeId })
    .sort({ scheduledAt: -1 })
    .lean();

  return meetings.map((meeting) => serializeMeeting(meeting as Record<string, unknown>));
}
