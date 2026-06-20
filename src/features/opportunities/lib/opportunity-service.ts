import { randomUUID } from "node:crypto";

import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  createOpportunitySchema,
  opportunityQuerySchema,
  opportunityViewTrackingSchema,
  saveOpportunitySchema,
  shareOpportunitySchema,
  updateOpportunitySchema,
} from "@/features/opportunities/lib/opportunity-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  OpportunityModel,
  OpportunityViewModel,
  SavedOpportunityModel,
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

function canManageOpportunities(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_APPROVE)
  );
}

function canCreateOpportunity(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_CREATE) ||
    hasRole(
      actor.role,
      ["EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function canReadOpportunity(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_READ) ||
    hasRole(
      actor.role,
      [
        "STUDENT",
        "ALUMNI",
        "TEACHER",
        "EMPLOYER",
        "SUPER_ADMIN",
        "CAMPUS_ADMIN",
      ],
      actor.roles,
    )
  );
}

function resolveWriteUniversity(
  actor: AuthUser,
  requestedUniversityId?: string,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    const universityId = requestedUniversityId ?? actor.universityId;
    if (!universityId) throw forbidden("University scope is required.");

    return universityId;
  }

  if (
    actor.universityId &&
    requestedUniversityId &&
    requestedUniversityId !== actor.universityId
  ) {
    throw forbidden("Cannot create opportunities for another university.");
  }
  const universityId = requestedUniversityId ?? actor.universityId;
  if (!universityId) throw forbidden("University scope is required.");

  return universityId;
}

function applyReadUniversityScope(
  actor: AuthUser,
  dbFilter: Record<string, unknown>,
  requestedUniversityId?: string,
) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    if (requestedUniversityId) dbFilter.universityId = requestedUniversityId;
    return;
  }

  if (
    actor.universityId &&
    requestedUniversityId &&
    requestedUniversityId !== actor.universityId
  ) {
    throw forbidden("Cannot access another university's opportunities.");
  }
  if (requestedUniversityId) dbFilter.universityId = requestedUniversityId;
  else if (actor.universityId) dbFilter.universityId = actor.universityId;
}

function serializeOpportunity(opportunity: Record<string, unknown>) {
  return {
    id: String(opportunity._id),
    universityId: String(opportunity.universityId),
    employerId: String(opportunity.employerId ?? opportunity.postedById),
    postedById: String(opportunity.postedById ?? opportunity.employerId),
    employerName:
      typeof opportunity.employerName === "string"
        ? opportunity.employerName
        : null,
    title: String(opportunity.title),
    description: String(opportunity.description),
    industry:
      typeof opportunity.industry === "string" ? opportunity.industry : null,
    location:
      typeof opportunity.location === "string" ? opportunity.location : null,
    locationType: String(opportunity.locationType ?? "ONSITE"),
    workType: String(opportunity.workType ?? opportunity.opportunityType),
    opportunityType: String(opportunity.opportunityType),
    salaryRange:
      typeof opportunity.salaryRange === "object" && opportunity.salaryRange
        ? opportunity.salaryRange
        : null,
    requirements: Array.isArray(opportunity.requirements)
      ? opportunity.requirements.map(String)
      : [],
    skills: Array.isArray(opportunity.skills)
      ? opportunity.skills.map(String)
      : [],
    applicationDeadline: serializeDate(
      opportunity.applicationDeadline ?? opportunity.deadlineAt,
    ),
    deadlineAt: serializeDate(opportunity.deadlineAt),
    applicationUrl:
      typeof opportunity.applicationUrl === "string"
        ? opportunity.applicationUrl
        : null,
    applicationInstructions:
      typeof opportunity.applicationInstructions === "string"
        ? opportunity.applicationInstructions
        : null,
    targetColleges: Array.isArray(opportunity.targetColleges)
      ? opportunity.targetColleges.map(String)
      : [],
    targetDepartments: Array.isArray(opportunity.targetDepartments)
      ? opportunity.targetDepartments.map(String)
      : [],
    targetYears: Array.isArray(opportunity.targetYears)
      ? opportunity.targetYears.map(String)
      : [],
    applicationCount: Number(opportunity.applicationCount ?? 0),
    savedCount: Number(opportunity.savedCount ?? 0),
    shareCount: Number(opportunity.shareCount ?? 0),
    viewCount: Number(opportunity.viewCount ?? 0),
    status: String(opportunity.status),
    createdAt: serializeDate(opportunity.createdAt),
    updatedAt: serializeDate(opportunity.updatedAt),
  };
}

async function assertOpportunityAccess(opportunityId: string, actor: AuthUser) {
  const opportunity = await OpportunityModel.findOne({
    _id: opportunityId,
    ...deletedFilter,
  }).lean();

  if (!opportunity) throw notFound("Opportunity not found.");
  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    actor.universityId &&
    opportunity.universityId !== actor.universityId
  ) {
    throw notFound("Opportunity not found.");
  }

  return opportunity;
}

function canMutateOpportunity(
  actor: AuthUser,
  opportunity: Record<string, unknown>,
) {
  return (
    canManageOpportunities(actor) ||
    opportunity.employerId === actor.id ||
    opportunity.postedById === actor.id
  );
}

async function actorDisplayName(actor: AuthUser) {
  if (actor.name) return actor.name;
  const user = await UserModel.findById(actor.id).select("name").lean();

  return typeof user?.name === "string" ? user.name : actor.email;
}

function viewerTypeFor(actor: AuthUser) {
  if (hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles)) {
    return "ADMIN";
  }
  if (hasRole(actor.role, ["STUDENT"], actor.roles)) return "STUDENT";
  if (hasRole(actor.role, ["ALUMNI"], actor.roles)) return "ALUMNI";
  if (hasRole(actor.role, ["TEACHER"], actor.roles)) return "TEACHER";
  if (hasRole(actor.role, ["EMPLOYER"], actor.roles)) return "EMPLOYER";

  return "OTHER";
}

export async function createOpportunity(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateOpportunity(actor)) {
    throw forbidden("Opportunity creation access is required.");
  }
  await connectMongo();
  const payload = createOpportunitySchema.parse(input);
  const universityId = resolveWriteUniversity(actor, payload.universityId);
  const deadline = payload.applicationDeadline ?? null;
  const opportunity = await OpportunityModel.create({
    _id: randomUUID(),
    universityId,
    postedById: actor.id,
    employerId: actor.id,
    employerName: await actorDisplayName(actor),
    title: payload.title,
    description: payload.description,
    industry: payload.industry,
    opportunityType: payload.workType,
    workType: payload.workType,
    salaryRange: payload.salaryRange ?? null,
    locationType: payload.locationType,
    location: payload.location ?? null,
    deadlineAt: deadline,
    applicationDeadline: deadline,
    requirements: normalizeList(payload.requirements),
    skills: normalizeList(payload.skills),
    targetColleges: normalizeList(payload.targetColleges),
    targetDepartments: normalizeList(payload.targetDepartments),
    targetYears: normalizeList(payload.targetYears),
    applicationUrl: payload.applicationUrl ?? null,
    applicationInstructions: payload.applicationInstructions ?? null,
    visibility: "UNIVERSITY",
    status: payload.status,
    createdById: actor.id,
  });

  await Promise.all([
    createActivity({
      actorId: actor.id,
      actorType: actor.role,
      universityId,
      activityType: "OPPORTUNITY_POSTED",
      title: payload.title,
      description: payload.description,
      entityType: "opportunity",
      entityId: String(opportunity._id),
      visibility: "UNIVERSITY",
      score: 0,
      metadata: {
        workType: payload.workType,
        industry: payload.industry,
      },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId,
      action: "OPPORTUNITY_CREATED",
      entityType: "opportunity",
      entityId: String(opportunity._id),
      after: serializeOpportunity(opportunity.toObject()),
    }),
  ]);

  return serializeOpportunity(opportunity.toObject());
}

export async function listOpportunities(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadOpportunity(actor)) {
    throw forbidden("Opportunity read access is required.");
  }
  await connectMongo();
  const filters = opportunityQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = { ...deletedFilter };
  applyReadUniversityScope(actor, dbFilter, filters.universityId);

  if (!canManageOpportunities(actor)) {
    dbFilter.$or = [
      { status: "PUBLISHED" },
      { employerId: actor.id },
      { postedById: actor.id },
    ];
  } else if (!filters.includeArchived) {
    dbFilter.status = { $ne: "ARCHIVED" };
  }
  if (filters.status) dbFilter.status = filters.status;
  if (filters.employerId) dbFilter.employerId = filters.employerId;
  if (filters.industry) dbFilter.industry = filters.industry;
  if (filters.workType) dbFilter.workType = filters.workType;
  if (filters.locationType) dbFilter.locationType = filters.locationType;
  if (filters.skills.length) dbFilter.skills = { $in: filters.skills };
  if (filters.deadlineFrom || filters.deadlineTo) {
    dbFilter.applicationDeadline = {};
    if (filters.deadlineFrom) {
      (dbFilter.applicationDeadline as Record<string, Date>).$gte =
        filters.deadlineFrom;
    }
    if (filters.deadlineTo) {
      (dbFilter.applicationDeadline as Record<string, Date>).$lte =
        filters.deadlineTo;
    }
  }
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  if (filters.savedOnly) {
    const saved = await SavedOpportunityModel.find({
      userId: actor.id,
      ...(dbFilter.universityId ? { universityId: dbFilter.universityId } : {}),
    })
      .select("opportunityId")
      .lean();
    dbFilter._id = { $in: saved.map((item) => String(item.opportunityId)) };
  }

  const opportunities = await OpportunityModel.find(dbFilter)
    .sort({ applicationDeadline: 1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return opportunities.map((opportunity) =>
    serializeOpportunity(opportunity as Record<string, unknown>),
  );
}

export async function getOpportunity(opportunityId: string) {
  const actor = await requireAuth();
  if (!canReadOpportunity(actor)) {
    throw forbidden("Opportunity read access is required.");
  }
  await connectMongo();
  const opportunity = await assertOpportunityAccess(opportunityId, actor);

  if (
    !canManageOpportunities(actor) &&
    opportunity.status !== "PUBLISHED" &&
    opportunity.employerId !== actor.id &&
    opportunity.postedById !== actor.id
  ) {
    throw notFound("Opportunity not found.");
  }

  return serializeOpportunity(opportunity as Record<string, unknown>);
}

export async function updateOpportunity(opportunityId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const opportunity = await assertOpportunityAccess(opportunityId, actor);
  if (!canMutateOpportunity(actor, opportunity as Record<string, unknown>)) {
    throw forbidden("You cannot update this opportunity.");
  }
  const payload = updateOpportunitySchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.description !== undefined)
    update.description = payload.description;
  if (payload.industry !== undefined) update.industry = payload.industry;
  if (payload.workType !== undefined) {
    update.workType = payload.workType;
    update.opportunityType = payload.workType;
  }
  if (payload.salaryRange !== undefined) {
    update.salaryRange = payload.salaryRange ?? null;
  }
  if (payload.location !== undefined)
    update.location = payload.location ?? null;
  if (payload.locationType !== undefined)
    update.locationType = payload.locationType;
  if (payload.applicationDeadline !== undefined) {
    update.applicationDeadline = payload.applicationDeadline ?? null;
    update.deadlineAt = payload.applicationDeadline ?? null;
  }
  if (payload.requirements !== undefined) {
    update.requirements = normalizeList(payload.requirements);
  }
  if (payload.skills !== undefined)
    update.skills = normalizeList(payload.skills);
  if (payload.applicationUrl !== undefined) {
    update.applicationUrl = payload.applicationUrl ?? null;
  }
  if (payload.applicationInstructions !== undefined) {
    update.applicationInstructions = payload.applicationInstructions ?? null;
  }
  if (payload.targetColleges !== undefined) {
    update.targetColleges = normalizeList(payload.targetColleges);
  }
  if (payload.targetDepartments !== undefined) {
    update.targetDepartments = normalizeList(payload.targetDepartments);
  }
  if (payload.targetYears !== undefined) {
    update.targetYears = normalizeList(payload.targetYears);
  }
  if (payload.status !== undefined) update.status = payload.status;

  const updated = await OpportunityModel.findOneAndUpdate(
    { _id: opportunityId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Opportunity not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(opportunity.universityId),
    action: "OPPORTUNITY_UPDATED",
    entityType: "opportunity",
    entityId: opportunityId,
    before: serializeOpportunity(opportunity as Record<string, unknown>),
    after: serializeOpportunity(updated as Record<string, unknown>),
  });

  return serializeOpportunity(updated as Record<string, unknown>);
}

export async function archiveOpportunity(opportunityId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const opportunity = await assertOpportunityAccess(opportunityId, actor);
  if (!canMutateOpportunity(actor, opportunity as Record<string, unknown>)) {
    throw forbidden("You cannot archive this opportunity.");
  }

  const updated = await OpportunityModel.findOneAndUpdate(
    { _id: opportunityId, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Opportunity not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(opportunity.universityId),
    action: "OPPORTUNITY_ARCHIVED",
    entityType: "opportunity",
    entityId: opportunityId,
    before: serializeOpportunity(opportunity as Record<string, unknown>),
    after: serializeOpportunity(updated as Record<string, unknown>),
  });

  return serializeOpportunity(updated as Record<string, unknown>);
}

export async function saveOpportunity(input: unknown) {
  const actor = await requireAuth();
  if (!canReadOpportunity(actor)) {
    throw forbidden("Opportunity read access is required.");
  }
  await connectMongo();
  const payload = saveOpportunitySchema.parse(input);
  const opportunity = await assertOpportunityAccess(
    payload.opportunityId,
    actor,
  );
  if (opportunity.status !== "PUBLISHED") {
    throw forbidden("Only published opportunities can be saved.");
  }
  const id = `saved-opportunity:${actor.id}:${payload.opportunityId}`;

  try {
    await SavedOpportunityModel.create({
      _id: id,
      universityId: opportunity.universityId,
      userId: actor.id,
      opportunityId: payload.opportunityId,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      return { saved: true, duplicate: true, id };
    }

    throw error;
  }

  await Promise.all([
    OpportunityModel.updateOne(
      { _id: payload.opportunityId },
      { $inc: { savedCount: 1 } },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(opportunity.universityId),
      action: "OPPORTUNITY_SAVED",
      entityType: "opportunity",
      entityId: payload.opportunityId,
    }),
  ]);

  return { saved: true, duplicate: false, id };
}

export async function unsaveOpportunity(opportunityId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const result = await SavedOpportunityModel.deleteOne({
    userId: actor.id,
    opportunityId,
  });

  if (!result.deletedCount) {
    return { saved: false, removed: false };
  }
  const opportunity = await OpportunityModel.findById(opportunityId).lean();
  await Promise.all([
    OpportunityModel.updateOne(
      { _id: opportunityId },
      { $inc: { savedCount: -1 } },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId:
        typeof opportunity?.universityId === "string"
          ? opportunity.universityId
          : (actor.universityId ?? null),
      action: "OPPORTUNITY_UNSAVED",
      entityType: "opportunity",
      entityId: opportunityId,
    }),
  ]);

  return { saved: false, removed: true };
}

export async function shareOpportunity(
  opportunityId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  if (!canReadOpportunity(actor)) {
    throw forbidden("Opportunity read access is required.");
  }
  await connectMongo();
  const payload = shareOpportunitySchema.parse(input);
  const opportunity = await assertOpportunityAccess(opportunityId, actor);
  if (opportunity.status !== "PUBLISHED") {
    throw forbidden("Only published opportunities can be shared.");
  }

  await Promise.all([
    OpportunityModel.updateOne(
      { _id: opportunityId },
      { $inc: { shareCount: 1 } },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(opportunity.universityId),
      action: "OPPORTUNITY_SHARED",
      entityType: "opportunity",
      entityId: opportunityId,
      metadata: {
        channel: payload.channel,
        metadata: payload.metadata ?? null,
      },
    }),
  ]);

  return {
    shared: true,
    channel: payload.channel,
  };
}

export async function trackOpportunityView(
  opportunityId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  if (!canReadOpportunity(actor)) {
    throw forbidden("Opportunity read access is required.");
  }
  await connectMongo();
  const payload = opportunityViewTrackingSchema.parse(input);
  const opportunity = await assertOpportunityAccess(opportunityId, actor);
  if (opportunity.status !== "PUBLISHED") {
    throw forbidden("Only published opportunities can be tracked as viewed.");
  }

  if (opportunity.employerId === actor.id || opportunity.postedById === actor.id) {
    return {
      tracked: false,
      reason: "OWNER_VIEW",
      opportunityId,
    };
  }

  const view = await OpportunityViewModel.create({
    _id: randomUUID(),
    universityId: opportunity.universityId,
    opportunityId,
    employerId: String(opportunity.employerId ?? opportunity.postedById),
    viewerId: actor.id,
    viewerRole: actor.role,
    viewerType: viewerTypeFor(actor),
    viewedAt: new Date(),
    source: payload.source,
    metadata: payload.metadata ?? null,
  });

  await Promise.all([
    OpportunityModel.updateOne({ _id: opportunityId }, { $inc: { viewCount: 1 } }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(opportunity.universityId),
      action: "OPPORTUNITY_VIEWED",
      entityType: "opportunity",
      entityId: opportunityId,
      metadata: {
        source: payload.source,
        viewerType: viewerTypeFor(actor),
      },
    }),
  ]);

  return {
    tracked: true,
    viewId: String(view._id),
    opportunityId,
  };
}
