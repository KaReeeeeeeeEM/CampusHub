import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  createSponsorshipSchema,
  reviewSponsorshipInterestSchema,
  sponsorshipInterestQuerySchema,
  sponsorshipQuerySchema,
  submitSponsorshipInterestSchema,
  updateSponsorshipSchema,
  type SponsorshipTargetEntityType,
} from "@/features/sponsorships/lib/sponsorship-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CommunityModel,
  EventModel,
  ProjectModel,
  SponsorshipInterestModel,
  SponsorshipModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function canManageSponsorships(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.SPONSORSHIP_MANAGE)
  );
}

function canApproveSponsorships(actor: AuthUser) {
  return (
    canManageSponsorships(actor) ||
    hasPermission(actor, PERMISSIONS.SPONSORSHIP_APPROVE)
  );
}

function canCreateSponsorship(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.SPONSORSHIP_CREATE) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function canSponsor(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.SPONSORSHIP_SPONSOR) ||
    hasRole(actor.role, ["EMPLOYER", "ALUMNI", "TEACHER"], actor.roles)
  );
}

function canReadSponsorship(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.SPONSORSHIP_READ) ||
    hasRole(
      actor.role,
      ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "SUPER_ADMIN", "CAMPUS_ADMIN"],
      actor.roles,
    )
  );
}

function resolveUniversityId(actor: AuthUser, requestedUniversityId?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    const universityId = requestedUniversityId ?? actor.universityId;
    if (!universityId) throw forbidden("University scope is required.");

    return universityId;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden("Cannot access another university's sponsorships.");
  }

  return actor.universityId;
}

function normalizeMoney(value: unknown) {
  const record =
    typeof value === "object" && value ? (value as Record<string, unknown>) : {};

  return {
    amount: typeof record.amount === "number" ? Number(record.amount) : null,
    currency: typeof record.currency === "string" ? record.currency : "TZS",
  };
}

function serializeSponsorship(sponsorship: Record<string, unknown>) {
  return {
    id: String(sponsorship._id),
    universityId: String(sponsorship.universityId),
    sponsorshipType: String(sponsorship.sponsorshipType),
    title: String(sponsorship.title),
    description: String(sponsorship.description),
    targetEntityType: String(sponsorship.targetEntityType ?? "NONE"),
    targetEntityId:
      typeof sponsorship.targetEntityId === "string"
        ? sponsorship.targetEntityId
        : null,
    requestedById: String(sponsorship.requestedById),
    sponsorId:
      typeof sponsorship.sponsorId === "string" ? sponsorship.sponsorId : null,
    sponsorName:
      typeof sponsorship.sponsorName === "string"
        ? sponsorship.sponsorName
        : null,
    requestedAmount: normalizeMoney(sponsorship.requestedAmount),
    committedAmount: normalizeMoney(sponsorship.committedAmount),
    benefits: Array.isArray(sponsorship.benefits)
      ? sponsorship.benefits.map(String)
      : [],
    eligibility: sponsorship.eligibility ?? null,
    applicationDeadline: serializeDate(sponsorship.applicationDeadline),
    startsAt: serializeDate(sponsorship.startsAt),
    endsAt: serializeDate(sponsorship.endsAt),
    visibility: String(sponsorship.visibility ?? "UNIVERSITY"),
    status: String(sponsorship.status ?? "DRAFT"),
    metadata: sponsorship.metadata ?? null,
    createdAt: serializeDate(sponsorship.createdAt),
    updatedAt: serializeDate(sponsorship.updatedAt),
  };
}

function serializeInterest(interest: Record<string, unknown>) {
  return {
    id: String(interest._id),
    universityId: String(interest.universityId),
    sponsorshipId: String(interest.sponsorshipId),
    sponsorId: String(interest.sponsorId),
    sponsorName:
      typeof interest.sponsorName === "string" ? interest.sponsorName : null,
    message: typeof interest.message === "string" ? interest.message : null,
    proposedAmount: normalizeMoney(interest.proposedAmount),
    status: String(interest.status ?? "PENDING"),
    reviewedById:
      typeof interest.reviewedById === "string" ? interest.reviewedById : null,
    reviewedAt: serializeDate(interest.reviewedAt),
    metadata: interest.metadata ?? null,
    createdAt: serializeDate(interest.createdAt),
    updatedAt: serializeDate(interest.updatedAt),
  };
}

async function validateTarget(input: {
  actor: AuthUser;
  universityId: string;
  targetEntityType: SponsorshipTargetEntityType;
  targetEntityId?: string | null;
  sponsorshipType: string;
}) {
  if (input.targetEntityType === "NONE") return;
  if (!input.targetEntityId) throw forbidden("Target entity is required.");

  if (input.targetEntityType === "PROJECT") {
    const project = await ProjectModel.findOne({
      _id: input.targetEntityId,
      universityId: input.universityId,
      ...deletedFilter,
    }).lean();
    if (!project) throw notFound("Project target not found.");
    if (
      project.ownerId !== input.actor.id &&
      !canManageSponsorships(input.actor)
    ) {
      throw forbidden("Only the project owner can request project sponsorship.");
    }
    return;
  }

  if (input.targetEntityType === "EVENT") {
    const event = await EventModel.findOne({
      _id: input.targetEntityId,
      universityId: input.universityId,
      ...deletedFilter,
    }).lean();
    if (!event) throw notFound("Event target not found.");
    if (
      input.sponsorshipType === "HACKATHON" &&
      event.eventType !== "HACKATHON"
    ) {
      throw forbidden("Hackathon sponsorships must target a hackathon event.");
    }
    return;
  }

  if (input.targetEntityType === "COMMUNITY") {
    const community = await CommunityModel.findOne({
      _id: input.targetEntityId,
      universityId: input.universityId,
      ...deletedFilter,
    }).lean();
    if (!community) throw notFound("Community target not found.");
    if (
      community.ownerId !== input.actor.id &&
      !canManageSponsorships(input.actor)
    ) {
      throw forbidden("Only the community owner can request community sponsorship.");
    }
    return;
  }

  if (input.targetEntityType === "USER") {
    const user = await UserModel.findOne({
      _id: input.targetEntityId,
      universityId: input.universityId,
      status: "ACTIVE",
      ...deletedFilter,
    }).lean();
    if (!user) throw notFound("User target not found.");
  }
}

async function getSponsorshipOrThrow(sponsorshipId: string, actor: AuthUser) {
  const sponsorship = await SponsorshipModel.findOne({
    _id: sponsorshipId,
    ...deletedFilter,
  }).lean();
  if (!sponsorship) throw notFound("Sponsorship not found.");
  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    sponsorship.universityId !== actor.universityId
  ) {
    throw notFound("Sponsorship not found.");
  }
  if (
    sponsorship.visibility === "PRIVATE" &&
    sponsorship.requestedById !== actor.id &&
    sponsorship.sponsorId !== actor.id &&
    !canManageSponsorships(actor)
  ) {
    throw notFound("Sponsorship not found.");
  }

  return sponsorship;
}

export async function createSponsorship(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateSponsorship(actor)) {
    throw forbidden("Sponsorship creation access is required.");
  }
  await connectMongo();
  const payload = createSponsorshipSchema.parse(input);
  const universityId = resolveUniversityId(actor, payload.universityId);
  await validateTarget({
    actor,
    universityId,
    targetEntityType: payload.targetEntityType,
    targetEntityId: payload.targetEntityId,
    sponsorshipType: payload.sponsorshipType,
  });

  const sponsorship = await SponsorshipModel.create({
    _id: randomUUID(),
    universityId,
    sponsorshipType: payload.sponsorshipType,
    title: payload.title,
    description: payload.description,
    targetEntityType: payload.targetEntityType,
    targetEntityId: payload.targetEntityId ?? null,
    requestedById: actor.id,
    sponsorId: payload.sponsorId ?? null,
    sponsorName: payload.sponsorName ?? null,
    requestedAmount: payload.requestedAmount ?? {},
    committedAmount: payload.committedAmount ?? {},
    benefits: payload.benefits,
    eligibility: payload.eligibility ?? null,
    applicationDeadline: payload.applicationDeadline ?? null,
    startsAt: payload.startsAt ?? null,
    endsAt: payload.endsAt ?? null,
    visibility: payload.visibility,
    status: payload.status,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "SPONSORSHIP_CREATED",
    entityType: "sponsorship",
    entityId: String(sponsorship._id),
    after: serializeSponsorship(sponsorship.toObject()),
  });

  return serializeSponsorship(sponsorship.toObject());
}

export async function listSponsorships(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadSponsorship(actor)) {
    throw forbidden("Sponsorship read access is required.");
  }
  await connectMongo();
  const filters = sponsorshipQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = { ...deletedFilter };
  const universityId = filters.universityId
    ? resolveUniversityId(actor, filters.universityId)
    : actor.universityId;

  if (universityId) dbFilter.universityId = universityId;
  if (filters.sponsorshipType) dbFilter.sponsorshipType = filters.sponsorshipType;
  if (filters.targetEntityType) dbFilter.targetEntityType = filters.targetEntityType;
  if (filters.targetEntityId) dbFilter.targetEntityId = filters.targetEntityId;
  if (filters.sponsorId) dbFilter.sponsorId = filters.sponsorId;
  if (filters.requestedById) dbFilter.requestedById = filters.requestedById;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.mine) {
    dbFilter.$or = [{ requestedById: actor.id }, { sponsorId: actor.id }];
  } else if (!canManageSponsorships(actor) && !filters.includePrivate) {
    dbFilter.visibility = { $ne: "PRIVATE" };
  }

  const sponsorships = await SponsorshipModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return sponsorships.map((sponsorship) =>
    serializeSponsorship(sponsorship as Record<string, unknown>),
  );
}

export async function getSponsorship(sponsorshipId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const sponsorship = await getSponsorshipOrThrow(sponsorshipId, actor);

  return serializeSponsorship(sponsorship as Record<string, unknown>);
}

export async function updateSponsorship(sponsorshipId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const sponsorship = await getSponsorshipOrThrow(sponsorshipId, actor);
  if (
    sponsorship.requestedById !== actor.id &&
    sponsorship.sponsorId !== actor.id &&
    !canManageSponsorships(actor) &&
    !hasPermission(actor, PERMISSIONS.SPONSORSHIP_UPDATE)
  ) {
    throw forbidden("You cannot update this sponsorship.");
  }

  const payload = updateSponsorshipSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };
  for (const [key, value] of Object.entries(payload)) {
    if (key === "targetEntityType" || key === "targetEntityId") continue;
    update[key] = value ?? null;
  }

  const updated = await SponsorshipModel.findOneAndUpdate(
    { _id: sponsorshipId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Sponsorship not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(sponsorship.universityId),
    action: "SPONSORSHIP_UPDATED",
    entityType: "sponsorship",
    entityId: sponsorshipId,
    before: serializeSponsorship(sponsorship as Record<string, unknown>),
    after: serializeSponsorship(updated as Record<string, unknown>),
  });

  return serializeSponsorship(updated as Record<string, unknown>);
}

export async function submitSponsorshipInterest(
  sponsorshipId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  if (!canSponsor(actor)) {
    throw forbidden("Sponsorship sponsor access is required.");
  }
  await connectMongo();
  const sponsorship = await getSponsorshipOrThrow(sponsorshipId, actor);
  if (!["OPEN", "APPROVED", "ACTIVE"].includes(String(sponsorship.status))) {
    throw forbidden("This sponsorship is not accepting sponsor interest.");
  }
  if (sponsorship.requestedById === actor.id) {
    throw forbidden("You cannot sponsor your own sponsorship request.");
  }

  const payload = submitSponsorshipInterestSchema.parse(input);
  let interest;
  try {
    interest = await SponsorshipInterestModel.create({
      _id: randomUUID(),
      universityId: sponsorship.universityId,
      sponsorshipId,
      sponsorId: actor.id,
      sponsorName: payload.sponsorName ?? actor.name ?? actor.email,
      message: payload.message ?? null,
      proposedAmount: payload.proposedAmount ?? {},
      status: "PENDING",
      metadata: payload.metadata ?? null,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      throw forbidden("Sponsor interest already exists.");
    }

    throw error;
  }

  await Promise.all([
    createSystemNotification({
      target: { recipientId: String(sponsorship.requestedById) },
      senderId: actor.id,
      type: "SYSTEM",
      title: "New sponsorship interest",
      message: `A sponsor expressed interest in ${String(sponsorship.title)}.`,
      entityType: "sponsorship_interest",
      entityId: String(interest._id),
      actionUrl: `/sponsorships/${sponsorshipId}`,
      priority: "NORMAL",
      metadata: { sponsorshipId },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(sponsorship.universityId),
      action: "SPONSORSHIP_INTEREST_SUBMITTED",
      entityType: "sponsorship_interest",
      entityId: String(interest._id),
      after: serializeInterest(interest.toObject()),
    }),
  ]);

  return serializeInterest(interest.toObject());
}

export async function listSponsorshipInterests(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = sponsorshipInterestQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {};
  if (filters.universityId) dbFilter.universityId = resolveUniversityId(actor, filters.universityId);
  else if (!hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) && actor.universityId) {
    dbFilter.universityId = actor.universityId;
  }
  if (filters.sponsorshipId) dbFilter.sponsorshipId = filters.sponsorshipId;
  if (filters.sponsorId) dbFilter.sponsorId = filters.sponsorId;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  if (filters.mine) {
    dbFilter.sponsorId = actor.id;
  } else if (!canManageSponsorships(actor)) {
    const owned = await SponsorshipModel.find({
      requestedById: actor.id,
      ...deletedFilter,
    })
      .select("_id")
      .lean();
    dbFilter.$or = [
      { sponsorId: actor.id },
      { sponsorshipId: { $in: owned.map((item) => String(item._id)) } },
    ];
  }

  const interests = await SponsorshipInterestModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return interests.map((interest) =>
    serializeInterest(interest as Record<string, unknown>),
  );
}

async function reviewInterest(
  interestId: string,
  status: "APPROVED" | "DECLINED",
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = reviewSponsorshipInterestSchema.parse(input);
  const interest = await SponsorshipInterestModel.findById(interestId).lean();
  if (!interest) throw notFound("Sponsorship interest not found.");
  const sponsorship = await getSponsorshipOrThrow(String(interest.sponsorshipId), actor);
  if (sponsorship.requestedById !== actor.id && !canApproveSponsorships(actor)) {
    throw forbidden("Sponsorship approval access is required.");
  }
  if (interest.status !== "PENDING") {
    throw forbidden("Only pending sponsorship interest can be reviewed.");
  }

  const updated = await SponsorshipInterestModel.findOneAndUpdate(
    { _id: interestId, status: "PENDING" },
    {
      $set: {
        status,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        metadata: {
          ...(typeof interest.metadata === "object" && interest.metadata
            ? (interest.metadata as Record<string, unknown>)
            : {}),
          reviewNote: payload.note ?? null,
        },
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Sponsorship interest not found.");

  if (status === "APPROVED") {
    await SponsorshipModel.updateOne(
      { _id: sponsorship._id },
      {
        $set: {
          sponsorId: interest.sponsorId,
          sponsorName: interest.sponsorName ?? null,
          committedAmount: interest.proposedAmount ?? {},
          status: "ACTIVE",
          updatedById: actor.id,
        },
      },
    );
  }

  await Promise.all([
    createSystemNotification({
      target: { recipientId: String(interest.sponsorId) },
      senderId: actor.id,
      type: "SYSTEM",
      title: `Sponsorship interest ${status.toLowerCase()}`,
      message: `Your sponsorship interest for ${String(sponsorship.title)} was ${status.toLowerCase()}.`,
      entityType: "sponsorship_interest",
      entityId: interestId,
      actionUrl: `/sponsorships/${String(sponsorship._id)}`,
      priority: status === "APPROVED" ? "HIGH" : "NORMAL",
      metadata: { sponsorshipId: sponsorship._id },
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(interest.universityId),
      action:
        status === "APPROVED"
          ? "SPONSORSHIP_INTEREST_APPROVED"
          : "SPONSORSHIP_INTEREST_DECLINED",
      entityType: "sponsorship_interest",
      entityId: interestId,
      before: serializeInterest(interest as Record<string, unknown>),
      after: serializeInterest(updated as Record<string, unknown>),
    }),
  ]);

  return serializeInterest(updated as Record<string, unknown>);
}

export function approveSponsorshipInterest(
  interestId: string,
  input: unknown = {},
) {
  return reviewInterest(interestId, "APPROVED", input);
}

export function declineSponsorshipInterest(
  interestId: string,
  input: unknown = {},
) {
  return reviewInterest(interestId, "DECLINED", input);
}

export async function withdrawSponsorshipInterest(interestId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const interest = await SponsorshipInterestModel.findById(interestId).lean();
  if (!interest) throw notFound("Sponsorship interest not found.");
  if (interest.sponsorId !== actor.id && !canManageSponsorships(actor)) {
    throw forbidden("Only the sponsor can withdraw this interest.");
  }
  if (interest.status !== "PENDING") {
    throw forbidden("Only pending sponsorship interest can be withdrawn.");
  }

  const updated = await SponsorshipInterestModel.findOneAndUpdate(
    { _id: interestId, status: "PENDING" },
    { $set: { status: "WITHDRAWN" } },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Sponsorship interest not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(interest.universityId),
    action: "SPONSORSHIP_INTEREST_WITHDRAWN",
    entityType: "sponsorship_interest",
    entityId: interestId,
    before: serializeInterest(interest as Record<string, unknown>),
    after: serializeInterest(updated as Record<string, unknown>),
  });

  return serializeInterest(updated as Record<string, unknown>);
}
