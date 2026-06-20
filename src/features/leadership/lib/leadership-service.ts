import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  approveLeadershipReportSchema,
  assignLeadershipSchema,
  archiveLeadershipReportSchema,
  createLeadershipPositionSchema,
  createLeadershipReportSchema,
  endLeadershipTermSchema,
  leadershipReportAnalyticsQuerySchema,
  leadershipReportQuerySchema,
  leadershipAssignmentQuerySchema,
  listLeadershipPositionsQuerySchema,
  rejectLeadershipReportSchema,
  reviewLeadershipReportSchema,
  transferLeadershipSchema,
  updateLeadershipPositionSchema,
} from "@/features/leadership/lib/leadership-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CollegeModel,
  CommitteeModel,
  DepartmentModel,
  LeadershipAssignmentModel,
  LeadershipReportModel,
  PositionModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function canManageLeadership(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.USER_ASSIGN_POSITION) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE)
  );
}

function assertCanManageLeadership(actor: AuthUser) {
  if (!canManageLeadership(actor)) {
    throw forbidden("Leadership management access is required.");
  }
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (isSuperAdmin(actor)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot manage another university's leadership.");
  }

  return actor.universityId;
}

function serializePosition(position: Record<string, unknown>) {
  return {
    id: String(position._id),
    universityId: String(position.universityId),
    collegeId: typeof position.collegeId === "string" ? position.collegeId : null,
    departmentId:
      typeof position.departmentId === "string" ? position.departmentId : null,
    committeeId:
      typeof position.committeeId === "string" ? position.committeeId : null,
    name: String(position.name ?? position.title),
    title: String(position.title ?? position.name),
    description:
      typeof position.description === "string" ? position.description : null,
    parentPositionId:
      typeof position.parentPositionId === "string"
        ? position.parentPositionId
        : null,
    roleType: String(position.roleType ?? "ADMINISTRATIVE"),
    level: String(position.level),
    permissions: Array.isArray(position.permissions)
      ? position.permissions.map(String)
      : [],
    status: String(position.status ?? "ACTIVE"),
    metadata: position.metadata ?? null,
    createdAt: serializeDate(position.createdAt),
    updatedAt: serializeDate(position.updatedAt),
  };
}

function serializeAssignment(assignment: Record<string, unknown>) {
  return {
    id: String(assignment._id),
    universityId: String(assignment.universityId),
    collegeId:
      typeof assignment.collegeId === "string" ? assignment.collegeId : null,
    departmentId:
      typeof assignment.departmentId === "string"
        ? assignment.departmentId
        : null,
    committeeId:
      typeof assignment.committeeId === "string"
        ? assignment.committeeId
        : null,
    scopeType: String(assignment.scopeType),
    positionId: String(assignment.positionId),
    userId: String(assignment.userId),
    title: String(assignment.title),
    name: String(assignment.title),
    termLabel:
      typeof assignment.termLabel === "string" ? assignment.termLabel : null,
    startDate: serializeDate(assignment.startDate ?? assignment.startedAt),
    endDate: serializeDate(assignment.endDate ?? assignment.endedAt),
    startedAt: serializeDate(assignment.startedAt),
    endedAt: serializeDate(assignment.endedAt),
    endReason:
      typeof assignment.endReason === "string" ? assignment.endReason : null,
    appointedBy:
      typeof assignment.appointedBy === "string" ? assignment.appointedBy : null,
    transferredFromAssignmentId:
      typeof assignment.transferredFromAssignmentId === "string"
        ? assignment.transferredFromAssignmentId
        : null,
    transferredToAssignmentId:
      typeof assignment.transferredToAssignmentId === "string"
        ? assignment.transferredToAssignmentId
        : null,
    status: String(assignment.status ?? "ACTIVE"),
    metadata: assignment.metadata ?? null,
    createdAt: serializeDate(assignment.createdAt),
    updatedAt: serializeDate(assignment.updatedAt),
  };
}

function serializeReport(report: Record<string, unknown>) {
  return {
    id: String(report._id),
    universityId: String(report.universityId),
    collegeId: typeof report.collegeId === "string" ? report.collegeId : null,
    departmentId:
      typeof report.departmentId === "string" ? report.departmentId : null,
    committeeId:
      typeof report.committeeId === "string" ? report.committeeId : null,
    scopeType: String(report.scopeType),
    assignmentId:
      typeof report.assignmentId === "string" ? report.assignmentId : null,
    positionId: typeof report.positionId === "string" ? report.positionId : null,
    authorId: String(report.authorId ?? report.submittedById),
    submittedById: String(report.submittedById),
    title: String(report.title),
    description: String(report.description ?? report.content ?? ""),
    reportType: String(report.reportType ?? "GENERAL"),
    summary: typeof report.summary === "string" ? report.summary : null,
    content: typeof report.content === "string" ? report.content : null,
    reportingPeriodStart: serializeDate(report.reportingPeriodStart),
    reportingPeriodEnd: serializeDate(report.reportingPeriodEnd),
    attachments: Array.isArray(report.attachments) ? report.attachments : [],
    status: String(report.status ?? "DRAFT"),
    submittedAt: serializeDate(report.submittedAt),
    reviewedById:
      typeof report.reviewedById === "string" ? report.reviewedById : null,
    reviewedBy:
      typeof report.reviewedBy === "string"
        ? report.reviewedBy
        : typeof report.reviewedById === "string"
          ? report.reviewedById
          : null,
    reviewedAt: serializeDate(report.reviewedAt),
    reviewNotes:
      typeof report.reviewNotes === "string" ? report.reviewNotes : null,
    approvedById:
      typeof report.approvedById === "string" ? report.approvedById : null,
    approvedAt: serializeDate(report.approvedAt),
    rejectedById:
      typeof report.rejectedById === "string" ? report.rejectedById : null,
    rejectedAt: serializeDate(report.rejectedAt),
    rejectionReason:
      typeof report.rejectionReason === "string"
        ? report.rejectionReason
        : null,
    archivedById:
      typeof report.archivedById === "string" ? report.archivedById : null,
    archivedAt: serializeDate(report.archivedAt),
    archiveReason:
      typeof report.archiveReason === "string" ? report.archiveReason : null,
    metadata: report.metadata ?? null,
    createdAt: serializeDate(report.createdAt),
    updatedAt: serializeDate(report.updatedAt),
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

async function getActiveUserInUniversity(userId: string, universityId: string) {
  const user = await UserModel.findOne({
    _id: userId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!user) {
    throw forbidden("Leadership user must be active in this university.");
  }

  return user as Record<string, unknown>;
}

async function getPositionOrThrow(positionId: string, actor: AuthUser) {
  const position = await PositionModel.findOne({
    _id: positionId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!position) throw notFound("Leadership position not found.");
  const universityId = scopedUniversityId(actor, String(position.universityId));
  if (!universityId) throw forbidden("University scope is required.");

  return position as Record<string, unknown> & {
    _id: string;
    universityId: string;
    collegeId?: string | null;
    departmentId?: string | null;
    committeeId?: string | null;
    title: string;
    name?: string;
    level: "UNIVERSITY" | "COLLEGE" | "DEPARTMENT" | "CLASS" | "COMMITTEE";
    roleType?: string;
  };
}

async function applyLeadershipUserFlags(input: {
  userId: string;
  position: Awaited<ReturnType<typeof getPositionOrThrow>>;
  actorId: string;
}) {
  const addToSet: Record<string, unknown> = {};
  const set: Record<string, unknown> = {
    updatedById: input.actorId,
  };

  if (input.position.level === "COLLEGE" && input.position.roleType === "STUDENT_LEADERSHIP") {
    set.position = "REPRESENTATIVE";
    addToSet.studentLeadershipPositions = "REPRESENTATIVE";
  }

  if (input.position.level === "COMMITTEE") {
    set.position = "COMMITTEE_MEMBER";
    addToSet.studentLeadershipPositions = "COMMITTEE_MEMBER";
  }

  await UserModel.updateOne(
    { _id: input.userId },
    {
      $set: set,
      ...(Object.keys(addToSet).length ? { $addToSet: addToSet } : {}),
    },
  );
}

export async function createLeadershipPosition(input: unknown) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = createLeadershipPositionSchema.parse(input);
  const universityId = scopedUniversityId(actor, payload.universityId);

  if (!universityId) throw forbidden("University scope is required.");

  await assertCollegeScope(universityId, payload.collegeId);
  await assertDepartmentScope(
    universityId,
    payload.collegeId,
    payload.departmentId,
  );

  const position = await PositionModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: payload.collegeId ?? null,
    departmentId: payload.departmentId ?? null,
    committeeId: payload.committeeId ?? null,
    name: payload.name,
    title: payload.title,
    description: payload.description ?? null,
    parentPositionId: payload.parentPositionId ?? null,
    roleType: payload.roleType,
    level: payload.level,
    permissions: payload.permissions,
    status: payload.status ?? "ACTIVE",
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LEADERSHIP_POSITION_CREATED",
    entityType: "position",
    entityId: String(position._id),
    after: serializePosition(position.toObject()),
  });

  return serializePosition(position.toObject());
}

export async function getLeadershipPosition(id: string) {
  const actor = await requireAuth();
  await connectMongo();
  const position = await PositionModel.findOne({
    _id: id,
    ...deletedFilter,
  }).lean();
  if (!position) throw notFound("Leadership position not found.");
  scopedUniversityId(actor, String(position.universityId));

  return serializePosition(position as Record<string, unknown>);
}

export async function updateLeadershipPosition(id: string, input: unknown) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const before = await PositionModel.findOne({
    _id: id,
    ...deletedFilter,
  }).lean();
  if (!before) throw notFound("Leadership position not found.");
  const universityId = scopedUniversityId(actor, String(before.universityId));
  if (!universityId) throw forbidden("University scope is required.");
  const payload = updateLeadershipPositionSchema.parse(input);

  if (payload.collegeId !== undefined) {
    await assertCollegeScope(universityId, payload.collegeId);
  }
  if (payload.departmentId !== undefined) {
    await assertDepartmentScope(
      universityId,
      payload.collegeId ?? (before.collegeId ? String(before.collegeId) : null),
      payload.departmentId,
    );
  }
  if (payload.parentPositionId) {
    const parent = await PositionModel.exists({
      _id: payload.parentPositionId,
      universityId,
      ...deletedFilter,
    });
    if (!parent) throw forbidden("Parent position must belong to the university.");
  }

  const set: Record<string, unknown> = {
    updatedById: actor.id,
  };
  for (const key of [
    "collegeId",
    "departmentId",
    "committeeId",
    "name",
    "title",
    "description",
    "parentPositionId",
    "roleType",
    "level",
    "permissions",
    "status",
    "metadata",
  ] as const) {
    if (payload[key] !== undefined) set[key] = payload[key] ?? null;
  }

  const position = await PositionModel.findOneAndUpdate(
    { _id: id },
    { $set: set },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LEADERSHIP_POSITION_UPDATED",
    entityType: "position",
    entityId: id,
    before: serializePosition(before as Record<string, unknown>),
    after: position
      ? serializePosition(position as Record<string, unknown>)
      : null,
  });

  return serializePosition(position as Record<string, unknown>);
}

export async function removeLeadershipPosition(id: string) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const before = await PositionModel.findOne({
    _id: id,
    ...deletedFilter,
  }).lean();
  if (!before) throw notFound("Leadership position not found.");
  const universityId = scopedUniversityId(actor, String(before.universityId));
  if (!universityId) throw forbidden("University scope is required.");
  const activeAssignments = await LeadershipAssignmentModel.exists({
    positionId: id,
    status: "ACTIVE",
  });
  if (activeAssignments) {
    throw forbidden("Remove active assignments before archiving this position.");
  }

  const position = await PositionModel.findOneAndUpdate(
    { _id: id },
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
    universityId,
    action: "LEADERSHIP_POSITION_REMOVED",
    entityType: "position",
    entityId: id,
    before: serializePosition(before as Record<string, unknown>),
    after: position
      ? serializePosition(position as Record<string, unknown>)
      : null,
  });

  return serializePosition(position as Record<string, unknown>);
}

export async function listLeadershipPositions(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = listLeadershipPositionsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);

  if (!universityId) throw forbidden("University scope is required.");

  const dbFilter: Record<string, unknown> = {
    universityId,
    status: filters.status,
    ...deletedFilter,
  };

  if (filters.level) dbFilter.level = filters.level;
  if (filters.collegeId) dbFilter.collegeId = filters.collegeId;
  if (filters.departmentId) dbFilter.departmentId = filters.departmentId;
  if (filters.committeeId) dbFilter.committeeId = filters.committeeId;
  if (filters.q) {
    dbFilter.$or = [
      { name: { $regex: filters.q, $options: "i" } },
      { title: { $regex: filters.q, $options: "i" } },
    ];
  }

  const positions = await PositionModel.find(dbFilter)
    .sort({ level: 1, title: 1 })
    .limit(filters.limit)
    .lean();

  return positions.map((position) =>
    serializePosition(position as Record<string, unknown>),
  );
}

export async function assignLeadership(input: unknown) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = assignLeadershipSchema.parse(input);
  const position = await getPositionOrThrow(payload.positionId, actor);
  await getActiveUserInUniversity(payload.userId, position.universityId);

  const activeConflict = await LeadershipAssignmentModel.findOne({
    universityId: position.universityId,
    positionId: String(position._id),
    status: "ACTIVE",
  }).lean();

  if (activeConflict) {
    throw forbidden("This leadership position already has an active assignment.");
  }

  const assignment = await LeadershipAssignmentModel.create({
    _id: randomUUID(),
    universityId: position.universityId,
    collegeId: position.collegeId ?? null,
    departmentId: position.departmentId ?? null,
    committeeId: position.committeeId ?? null,
    scopeType: position.level,
    positionId: String(position._id),
    userId: payload.userId,
    title: payload.title ?? payload.name ?? position.title ?? position.name,
    termLabel: payload.termLabel ?? null,
    startDate: payload.startDate ?? payload.startedAt ?? new Date(),
    startedAt: payload.startDate ?? payload.startedAt ?? new Date(),
    appointedBy: actor.id,
    status: "ACTIVE",
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  await applyLeadershipUserFlags({
    userId: payload.userId,
    position,
    actorId: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: position.universityId,
    action: "LEADERSHIP_ASSIGNED",
    entityType: "leadership_assignment",
    entityId: String(assignment._id),
    after: serializeAssignment(assignment.toObject()),
  });

  return serializeAssignment(assignment.toObject());
}

async function getAssignmentForActor(id: string, actor: AuthUser) {
  const assignment = await LeadershipAssignmentModel.findOne({
    _id: id,
  }).lean();

  if (!assignment) throw notFound("Leadership assignment not found.");
  scopedUniversityId(actor, String(assignment.universityId));

  return assignment as Record<string, unknown>;
}

async function getReportForActor(id: string, actor: AuthUser) {
  const report = await LeadershipReportModel.findOne({
    _id: id,
    ...deletedFilter,
  }).lean();

  if (!report) throw notFound("Leadership report not found.");
  scopedUniversityId(actor, String(report.universityId));

  if (
    !canManageLeadership(actor) &&
    report.submittedById !== actor.id &&
    report.authorId !== actor.id
  ) {
    throw forbidden("You can only access your own leadership reports.");
  }

  return report as Record<string, unknown>;
}

export async function endLeadershipTerm(id: string, input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = endLeadershipTermSchema.parse(input);
  const before = await getAssignmentForActor(id, actor);
  const endedAt = payload.endDate ?? payload.endedAt ?? new Date();
  const assignment = await LeadershipAssignmentModel.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: payload.status,
        endDate: endedAt,
        endedAt,
        endReason: payload.endReason ?? null,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action:
      payload.status === "REMOVED"
        ? "LEADERSHIP_REMOVED"
        : "LEADERSHIP_TERM_ENDED",
    entityType: "leadership_assignment",
    entityId: id,
    before: serializeAssignment(before),
    after: assignment
      ? serializeAssignment(assignment as Record<string, unknown>)
      : null,
  });

  return serializeAssignment(assignment as Record<string, unknown>);
}

export async function removeLeadershipAssignment(id: string, input: unknown = {}) {
  return endLeadershipTerm(id, { ...(input as Record<string, unknown>), status: "REMOVED" });
}

export async function transferLeadership(id: string, input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = transferLeadershipSchema.parse(input);
  const before = await getAssignmentForActor(id, actor);
  const targetPosition = payload.positionId
    ? await getPositionOrThrow(payload.positionId, actor)
    : await getPositionOrThrow(String(before.positionId), actor);
  const userId = payload.userId ?? String(before.userId);

  await getActiveUserInUniversity(userId, targetPosition.universityId);

  const endedAt = new Date();
  const newAssignment = await LeadershipAssignmentModel.create({
    _id: randomUUID(),
    universityId: targetPosition.universityId,
    collegeId: targetPosition.collegeId ?? null,
    departmentId: targetPosition.departmentId ?? null,
    committeeId: targetPosition.committeeId ?? null,
    scopeType: targetPosition.level,
    positionId: String(targetPosition._id),
    userId,
    title: payload.title ?? payload.name ?? targetPosition.title,
    termLabel: payload.termLabel ?? before.termLabel ?? null,
    startDate: payload.startDate ?? payload.startedAt ?? endedAt,
    startedAt: payload.startDate ?? payload.startedAt ?? endedAt,
    appointedBy: actor.id,
    transferredFromAssignmentId: id,
    status: "ACTIVE",
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  await LeadershipAssignmentModel.updateOne(
    { _id: id },
    {
      $set: {
        status: "TRANSFERRED",
        endDate: endedAt,
        endedAt,
        endReason: payload.endReason ?? "Transferred",
        transferredToAssignmentId: String(newAssignment._id),
        updatedById: actor.id,
      },
    },
  );
  await applyLeadershipUserFlags({
    userId,
    position: targetPosition,
    actorId: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: targetPosition.universityId,
    action: "LEADERSHIP_TRANSFERRED",
    entityType: "leadership_assignment",
    entityId: String(newAssignment._id),
    before: serializeAssignment(before),
    after: serializeAssignment(newAssignment.toObject()),
  });

  return serializeAssignment(newAssignment.toObject());
}

export async function listLeadershipAssignments(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = leadershipAssignmentQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);

  if (!universityId) throw forbidden("University scope is required.");

  const dbFilter: Record<string, unknown> = {
    universityId,
  };

  if (!filters.includeHistorical) dbFilter.status = filters.status ?? "ACTIVE";
  else if (filters.status) dbFilter.status = filters.status;
  if (filters.scopeType) dbFilter.scopeType = filters.scopeType;
  if (filters.collegeId) dbFilter.collegeId = filters.collegeId;
  if (filters.departmentId) dbFilter.departmentId = filters.departmentId;
  if (filters.committeeId) dbFilter.committeeId = filters.committeeId;
  if (filters.userId) dbFilter.userId = filters.userId;
  if (filters.positionId) dbFilter.positionId = filters.positionId;
  if (filters.cursor) dbFilter.startedAt = { $lt: new Date(filters.cursor) };

  const assignments = await LeadershipAssignmentModel.find(dbFilter)
    .sort({ startedAt: -1 })
    .limit(filters.limit)
    .lean();

  return assignments.map((assignment) =>
    serializeAssignment(assignment as Record<string, unknown>),
  );
}

export async function submitLeadershipReport(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = createLeadershipReportSchema.parse(input);

  let assignment: Record<string, unknown> | null = null;
  if (payload.assignmentId) {
    assignment = await LeadershipAssignmentModel.findOne({
      _id: payload.assignmentId,
      status: "ACTIVE",
    }).lean();
    if (!assignment) throw notFound("Active leadership assignment not found.");

    scopedUniversityId(actor, String(assignment.universityId));
    if (!canManageLeadership(actor) && assignment.userId !== actor.id) {
      throw forbidden("You can only create reports for your own assignment.");
    }
  }

  let universityId = assignment
    ? String(assignment.universityId)
    : scopedUniversityId(actor, actor.universityId ?? undefined);
  if (!universityId) throw forbidden("University scope is required.");
  let committeeId =
    payload.committeeId ?? (assignment?.committeeId ? String(assignment.committeeId) : null);
  if (committeeId) {
    const committee = await CommitteeModel.findOne({
      _id: committeeId,
      universityId,
      ...deletedFilter,
    }).lean();
    if (!committee) throw forbidden("Committee must belong to the university.");
    universityId = String(committee.universityId);
    committeeId = String(committee._id);
  }

  const description = payload.description ?? payload.content ?? "";
  const report = await LeadershipReportModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: assignment?.collegeId ?? null,
    departmentId: assignment?.departmentId ?? null,
    committeeId,
    scopeType: assignment?.scopeType ?? (committeeId ? "COMMITTEE" : "UNIVERSITY"),
    assignmentId: assignment ? String(assignment._id) : null,
    positionId: assignment?.positionId ?? null,
    authorId: actor.id,
    submittedById: actor.id,
    title: payload.title,
    description,
    reportType: payload.reportType,
    summary: payload.summary ?? null,
    content: payload.content ?? description,
    reportingPeriodStart: payload.reportingPeriodStart ?? null,
    reportingPeriodEnd: payload.reportingPeriodEnd ?? null,
    attachments: payload.attachments,
    status: payload.status,
    submittedAt: payload.status === "SUBMITTED" ? new Date() : null,
    metadata: payload.metadata ?? null,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LEADERSHIP_REPORT_SUBMITTED",
    entityType: "leadership_report",
    entityId: String(report._id),
    after: serializeReport(report.toObject()),
  });

  return serializeReport(report.toObject());
}

export async function listLeadershipReports(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = leadershipReportQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);

  if (!universityId) throw forbidden("University scope is required.");

  const dbFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };

  if (!canManageLeadership(actor)) dbFilter.authorId = actor.id;
  else if (filters.authorId) dbFilter.authorId = filters.authorId;
  else if (filters.submittedById) dbFilter.submittedById = filters.submittedById;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.reportType) dbFilter.reportType = filters.reportType;
  if (filters.scopeType) dbFilter.scopeType = filters.scopeType;
  if (filters.collegeId) dbFilter.collegeId = filters.collegeId;
  if (filters.departmentId) dbFilter.departmentId = filters.departmentId;
  if (filters.committeeId) dbFilter.committeeId = filters.committeeId;
  if (filters.assignmentId) dbFilter.assignmentId = filters.assignmentId;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };
  if (filters.from || filters.to) {
    dbFilter.reportingPeriodEnd = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }

  const reports = await LeadershipReportModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return reports.map((report) => serializeReport(report as Record<string, unknown>));
}

export async function submitLeadershipReportById(id: string) {
  const actor = await requireAuth();
  await connectMongo();
  const before = await getReportForActor(id, actor);
  if (before.authorId !== actor.id && !canManageLeadership(actor)) {
    throw forbidden("You can only submit your own leadership reports.");
  }
  const report = await LeadershipReportModel.findOneAndUpdate(
    { _id: id, status: { $in: ["DRAFT", "REJECTED"] } },
    {
      $set: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!report) throw forbidden("Only draft or rejected reports can be submitted.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "LEADERSHIP_REPORT_SUBMITTED",
    entityType: "leadership_report",
    entityId: id,
    before: serializeReport(before),
    after: serializeReport(report as Record<string, unknown>),
  });

  return serializeReport(report as Record<string, unknown>);
}

export async function reviewLeadershipReport(id: string, input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = reviewLeadershipReportSchema.parse(input);
  const before = await getReportForActor(id, actor);
  const report = await LeadershipReportModel.findOneAndUpdate(
    { _id: id, status: { $in: ["SUBMITTED", "UNDER_REVIEW"] } },
    {
      $set: {
        status: "UNDER_REVIEW",
        reviewedBy: actor.id,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewNotes: payload.reviewNotes ?? null,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!report) throw forbidden("Only submitted reports can be reviewed.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "LEADERSHIP_REPORT_REVIEWED",
    entityType: "leadership_report",
    entityId: id,
    before: serializeReport(before),
    after: serializeReport(report as Record<string, unknown>),
  });

  return serializeReport(report as Record<string, unknown>);
}

export async function approveLeadershipReport(id: string, input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = approveLeadershipReportSchema.parse(input);
  const before = await getReportForActor(id, actor);
  const report = await LeadershipReportModel.findOneAndUpdate(
    { _id: id, status: { $in: ["SUBMITTED", "UNDER_REVIEW"] } },
    {
      $set: {
        status: "APPROVED",
        reviewedBy: String(before.reviewedBy ?? before.reviewedById ?? actor.id),
        reviewedById: String(before.reviewedById ?? actor.id),
        reviewedAt: before.reviewedAt ?? new Date(),
        reviewNotes: payload.reviewNotes ?? before.reviewNotes ?? null,
        approvedById: actor.id,
        approvedAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!report) throw forbidden("Only submitted or reviewed reports can be approved.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "LEADERSHIP_REPORT_APPROVED",
    entityType: "leadership_report",
    entityId: id,
    before: serializeReport(before),
    after: serializeReport(report as Record<string, unknown>),
  });

  return serializeReport(report as Record<string, unknown>);
}

export async function rejectLeadershipReport(id: string, input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = rejectLeadershipReportSchema.parse(input);
  const before = await getReportForActor(id, actor);
  const report = await LeadershipReportModel.findOneAndUpdate(
    { _id: id, status: { $in: ["SUBMITTED", "UNDER_REVIEW"] } },
    {
      $set: {
        status: "REJECTED",
        reviewedBy: actor.id,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectedById: actor.id,
        rejectedAt: new Date(),
        rejectionReason: payload.rejectionReason,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!report) throw forbidden("Only submitted or reviewed reports can be rejected.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "LEADERSHIP_REPORT_REJECTED",
    entityType: "leadership_report",
    entityId: id,
    before: serializeReport(before),
    after: serializeReport(report as Record<string, unknown>),
  });

  return serializeReport(report as Record<string, unknown>);
}

export async function archiveLeadershipReport(id: string, input: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const payload = archiveLeadershipReportSchema.parse(input);
  const before = await getReportForActor(id, actor);
  const report = await LeadershipReportModel.findOneAndUpdate(
    { _id: id, status: { $ne: "ARCHIVED" } },
    {
      $set: {
        status: "ARCHIVED",
        archivedById: actor.id,
        archivedAt: new Date(),
        archiveReason: payload.archiveReason ?? null,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!report) throw forbidden("Leadership report is already archived.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "LEADERSHIP_REPORT_ARCHIVED",
    entityType: "leadership_report",
    entityId: id,
    before: serializeReport(before),
    after: serializeReport(report as Record<string, unknown>),
  });

  return serializeReport(report as Record<string, unknown>);
}

export async function exportLeadershipReport(id: string) {
  const actor = await requireAuth();
  await connectMongo();
  const report = await getReportForActor(id, actor);

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(report.universityId),
    action: "LEADERSHIP_REPORT_EXPORTED",
    entityType: "leadership_report",
    entityId: id,
  });

  return {
    exportedAt: new Date().toISOString(),
    format: "JSON",
    report: serializeReport(report),
  };
}

export async function getLeadershipReportAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  assertCanManageLeadership(actor);
  await connectMongo();
  const filters = leadershipReportAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);

  if (!universityId) throw forbidden("University scope is required.");

  const match: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (filters.scopeType) match.scopeType = filters.scopeType;
  if (filters.reportType) match.reportType = filters.reportType;
  if (filters.collegeId) match.collegeId = filters.collegeId;
  if (filters.departmentId) match.departmentId = filters.departmentId;
  if (filters.committeeId) match.committeeId = filters.committeeId;
  if (filters.from || filters.to) {
    match.reportingPeriodEnd = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }

  const [statusCounts, scopeCounts, totals] = await Promise.all([
    LeadershipReportModel.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    LeadershipReportModel.aggregate([
      { $match: match },
      { $group: { _id: "$scopeType", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    LeadershipReportModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          submittedReports: {
            $sum: { $cond: [{ $eq: ["$status", "SUBMITTED"] }, 1, 0] },
          },
          reviewedReports: {
            $sum: { $cond: [{ $eq: ["$status", "UNDER_REVIEW"] }, 1, 0] },
          },
          approvedReports: {
            $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] },
          },
          rejectedReports: {
            $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
          },
          archivedReports: {
            $sum: { $cond: [{ $eq: ["$status", "ARCHIVED"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);
  const summary = totals[0] ?? {
    totalReports: 0,
    submittedReports: 0,
    reviewedReports: 0,
    approvedReports: 0,
    rejectedReports: 0,
    archivedReports: 0,
  };

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LEADERSHIP_REPORT_ANALYTICS_VIEWED",
    entityType: "leadership_report",
    metadata: { filters },
  });

  return {
    totalReports: Number(summary.totalReports ?? 0),
    submittedReports: Number(summary.submittedReports ?? 0),
    reviewedReports: Number(summary.reviewedReports ?? 0),
    approvedReports: Number(summary.approvedReports ?? 0),
    rejectedReports: Number(summary.rejectedReports ?? 0),
    archivedReports: Number(summary.archivedReports ?? 0),
    byStatus: statusCounts.map((item) => ({
      status: String(item._id),
      count: Number(item.count ?? 0),
    })),
    byScope: scopeCounts.map((item) => ({
      scopeType: String(item._id),
      count: Number(item.count ?? 0),
    })),
  };
}
