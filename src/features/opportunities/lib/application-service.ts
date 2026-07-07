import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  applicationQuerySchema,
  applicationReviewSchema,
  applicationTransitionNoteSchema,
  applyOpportunitySchema,
} from "@/features/opportunities/lib/application-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  ApplicationModel,
  ApplicationStatusEventModel,
  OpportunityModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

type HiringStatus =
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

type AuditAction =
  | "APPLICATION_REVIEWED"
  | "APPLICATION_SHORTLISTED"
  | "APPLICATION_INTERVIEW"
  | "APPLICATION_REJECTED"
  | "APPLICATION_HIRED";

type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED"
  | "ACCEPTED"
  | "WITHDRAWN";

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function canApply(actor: AuthUser) {
  return (
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_APPLY) ||
    hasRole(actor.role, ["STUDENT", "ALUMNI"], actor.roles)
  );
}

function canManageApplications(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.OPPORTUNITY_APPROVE)
  );
}

function canEmployerReview(
  actor: AuthUser,
  opportunity: Record<string, unknown>,
) {
  return (
    canManageApplications(actor) ||
    opportunity.employerId === actor.id ||
    opportunity.postedById === actor.id
  );
}

function serializeApplication(application: Record<string, unknown>) {
  return {
    id: String(application._id),
    universityId: String(application.universityId),
    opportunityId: String(application.opportunityId),
    studentId: String(application.studentId ?? application.applicantId),
    applicantId: String(application.applicantId ?? application.studentId),
    cvUrl:
      typeof application.cvUrl === "string"
        ? application.cvUrl
        : typeof application.resumeUrl === "string"
          ? application.resumeUrl
          : null,
    resumeUrl:
      typeof application.resumeUrl === "string"
        ? application.resumeUrl
        : typeof application.cvUrl === "string"
          ? application.cvUrl
          : null,
    coverLetter:
      typeof application.coverLetter === "string"
        ? application.coverLetter
        : null,
    attachments: Array.isArray(application.attachments)
      ? application.attachments
      : [],
    answers:
      typeof application.answers === "object" && application.answers
        ? application.answers
        : null,
    status: String(application.status),
    submittedAt: serializeDate(application.submittedAt),
    reviewedById:
      typeof application.reviewedById === "string"
        ? application.reviewedById
        : null,
    reviewedAt: serializeDate(application.reviewedAt),
    withdrawnAt: serializeDate(application.withdrawnAt),
    metadata: application.metadata ?? null,
    createdAt: serializeDate(application.createdAt),
    updatedAt: serializeDate(application.updatedAt),
  };
}

function serializeOpportunitySummary(opportunity: Record<string, unknown>) {
  return {
    id: String(opportunity._id),
    title: String(opportunity.title),
    employerId: String(opportunity.employerId ?? opportunity.postedById),
    employerName:
      typeof opportunity.employerName === "string"
        ? opportunity.employerName
        : null,
    universityId: String(opportunity.universityId),
    status: String(opportunity.status),
  };
}

async function getOpportunityOrThrow(opportunityId: string) {
  const opportunity = await OpportunityModel.findOne({
    _id: opportunityId,
    ...deletedFilter,
  }).lean();

  if (!opportunity) throw notFound("Opportunity not found.");

  return opportunity;
}

async function getApplicationOrThrow(applicationId: string, actor: AuthUser) {
  const application = await ApplicationModel.findOne({
    _id: applicationId,
    ...deletedFilter,
  }).lean();
  if (!application) throw notFound("Application not found.");

  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    actor.universityId &&
    application.universityId !== actor.universityId
  ) {
    throw notFound("Application not found.");
  }

  return application;
}

async function getApplicationWithOpportunity(
  applicationId: string,
  actor: AuthUser,
) {
  const application = await getApplicationOrThrow(applicationId, actor);
  const opportunity = await getOpportunityOrThrow(
    String(application.opportunityId),
  );

  return { application, opportunity };
}

async function getActorName(actor: AuthUser) {
  if (actor.name) return actor.name;
  const user = await UserModel.findById(actor.id).select("name").lean();

  return typeof user?.name === "string" ? user.name : actor.email;
}

async function notifyApplicationStatus(input: {
  recipientId: string;
  senderId: string;
  applicationId: string;
  opportunity: Record<string, unknown>;
  status: string;
  note?: string | null;
}) {
  const statusText = input.status.toLowerCase().replace("_", " ");
  const title =
    input.status === "SUBMITTED"
      ? "Application submitted"
      : `Application ${statusText}`;
  const message =
    input.note ??
    (input.status === "SUBMITTED"
      ? `Your application for ${String(input.opportunity.title)} was submitted.`
      : `Your application for ${String(input.opportunity.title)} is now ${statusText}.`);

  await createSystemNotification({
    target: { recipientId: input.recipientId },
    senderId: input.senderId,
    type: "OPPORTUNITY",
    title,
    message,
    entityType: "application",
    entityId: input.applicationId,
    actionUrl: `/opportunities/${String(input.opportunity._id)}`,
    priority:
      input.status === "INTERVIEW" || input.status === "HIRED"
        ? "HIGH"
        : "NORMAL",
    metadata: {
      opportunityId: input.opportunity._id,
      status: input.status,
    },
  });
}

async function notifyEmployerOfSubmission(input: {
  employerId: string;
  senderId: string;
  applicationId: string;
  opportunity: Record<string, unknown>;
}) {
  if (input.employerId === input.senderId) return;

  await createSystemNotification({
    target: { recipientId: input.employerId },
    senderId: input.senderId,
    type: "OPPORTUNITY",
    title: "New application received",
    message: `A student applied for ${String(input.opportunity.title)}.`,
    entityType: "application",
    entityId: input.applicationId,
    actionUrl: `/employer/opportunities/${String(input.opportunity._id)}/applications`,
    priority: "NORMAL",
    metadata: {
      opportunityId: input.opportunity._id,
      applicantId: input.senderId,
    },
  });
}

async function recordApplicationStatusEvent(input: {
  application: Record<string, unknown>;
  opportunity: Record<string, unknown>;
  changedById: string;
  fromStatus?: string | null;
  toStatus: ApplicationStatus;
  note?: string | null;
}) {
  await ApplicationStatusEventModel.create({
    _id: randomUUID(),
    universityId: String(input.application.universityId),
    applicationId: String(input.application._id),
    opportunityId: String(input.application.opportunityId),
    employerId: String(
      input.opportunity.employerId ?? input.opportunity.postedById,
    ),
    studentId: String(
      input.application.studentId ?? input.application.applicantId,
    ),
    fromStatus: input.fromStatus ?? null,
    toStatus: input.toStatus,
    changedById: input.changedById,
    changedAt: new Date(),
    note: input.note ?? null,
  });
}

export async function applyToOpportunity(
  opportunityId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  if (!canApply(actor))
    throw forbidden("Opportunity application access is required.");
  await connectPostgres();
  const payload = applyOpportunitySchema.parse(input);
  const opportunity = await getOpportunityOrThrow(opportunityId);

  if (opportunity.status !== "PUBLISHED") {
    throw forbidden("This opportunity is not accepting applications.");
  }
  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    actor.universityId &&
    opportunity.universityId !== actor.universityId
  ) {
    throw forbidden("Cannot apply to another university's opportunity.");
  }
  if (
    opportunity.employerId === actor.id ||
    opportunity.postedById === actor.id
  ) {
    throw forbidden("You cannot apply to your own opportunity.");
  }

  let application;
  try {
    application = await ApplicationModel.create({
      _id: randomUUID(),
      universityId: opportunity.universityId,
      opportunityId,
      applicantId: actor.id,
      studentId: actor.id,
      cvUrl: payload.cvUrl ?? null,
      resumeUrl: payload.cvUrl ?? null,
      coverLetter: payload.coverLetter ?? null,
      attachments: payload.attachments,
      answers: payload.answers ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
      createdById: actor.id,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === 11000
    ) {
      throw forbidden("You have already applied to this opportunity.");
    }

    throw error;
  }

  await Promise.all([
    OpportunityModel.updateOne(
      { _id: opportunityId },
      { $inc: { applicationCount: 1 } },
    ),
    notifyApplicationStatus({
      recipientId: actor.id,
      senderId: String(opportunity.employerId ?? opportunity.postedById),
      applicationId: String(application._id),
      opportunity: opportunity as Record<string, unknown>,
      status: "SUBMITTED",
    }),
    notifyEmployerOfSubmission({
      employerId: String(opportunity.employerId ?? opportunity.postedById),
      senderId: actor.id,
      applicationId: String(application._id),
      opportunity: opportunity as Record<string, unknown>,
    }),
    recordApplicationStatusEvent({
      application: application.toObject(),
      opportunity: opportunity as Record<string, unknown>,
      changedById: actor.id,
      fromStatus: null,
      toStatus: "SUBMITTED",
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(opportunity.universityId),
      action: "APPLICATION_SUBMITTED",
      entityType: "application",
      entityId: String(application._id),
      after: serializeApplication(application.toObject()),
    }),
  ]);

  return serializeApplication(application.toObject());
}

export async function listApplications(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = applicationQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = { ...deletedFilter };

  if (
    !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
    actor.universityId
  ) {
    dbFilter.universityId = actor.universityId;
  }
  if (filters.opportunityId) dbFilter.opportunityId = filters.opportunityId;
  if (filters.studentId) {
    dbFilter.$or = [
      { studentId: filters.studentId },
      { applicantId: filters.studentId },
    ];
  }
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  if (filters.role === "APPLICANT") {
    dbFilter.$or = [{ studentId: actor.id }, { applicantId: actor.id }];
  } else if (filters.role === "EMPLOYER") {
    const opportunities = await OpportunityModel.find({
      $or: [{ employerId: actor.id }, { postedById: actor.id }],
      ...deletedFilter,
    })
      .select("_id")
      .lean();
    const opportunityIds = opportunities.map((opportunity) =>
      String(opportunity._id),
    );
    if (filters.opportunityId) {
      if (!opportunityIds.includes(filters.opportunityId)) {
        throw forbidden("You cannot access applications for this opportunity.");
      }
      dbFilter.opportunityId = filters.opportunityId;
    } else {
      dbFilter.opportunityId = { $in: opportunityIds };
    }
  } else if (!canManageApplications(actor)) {
    const opportunities = await OpportunityModel.find({
      $or: [{ employerId: actor.id }, { postedById: actor.id }],
      ...deletedFilter,
    })
      .select("_id")
      .lean();
    const opportunityIds = opportunities.map((opportunity) =>
      String(opportunity._id),
    );
    if (
      filters.opportunityId &&
      opportunityIds.includes(filters.opportunityId)
    ) {
      dbFilter.opportunityId = filters.opportunityId;
    } else if (filters.opportunityId) {
      dbFilter.$or = [{ studentId: actor.id }, { applicantId: actor.id }];
    } else {
      dbFilter.$or = [
        { studentId: actor.id },
        { applicantId: actor.id },
        { opportunityId: { $in: opportunityIds } },
      ];
    }
  }

  const applications = await ApplicationModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return applications.map((application) =>
    serializeApplication(application as Record<string, unknown>),
  );
}

export async function getApplication(applicationId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const { application, opportunity } = await getApplicationWithOpportunity(
    applicationId,
    actor,
  );

  if (
    application.studentId !== actor.id &&
    application.applicantId !== actor.id &&
    !canEmployerReview(actor, opportunity as Record<string, unknown>)
  ) {
    throw notFound("Application not found.");
  }

  return {
    application: serializeApplication(application as Record<string, unknown>),
    opportunity: serializeOpportunitySummary(
      opportunity as Record<string, unknown>,
    ),
  };
}

export async function withdrawApplication(applicationId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const { application, opportunity } = await getApplicationWithOpportunity(
    applicationId,
    actor,
  );

  if (
    application.studentId !== actor.id &&
    application.applicantId !== actor.id
  ) {
    throw forbidden("Only the applicant can withdraw this application.");
  }
  if (["REJECTED", "HIRED", "WITHDRAWN"].includes(String(application.status))) {
    throw forbidden("This application can no longer be withdrawn.");
  }

  const updated = await ApplicationModel.findOneAndUpdate(
    { _id: applicationId, ...deletedFilter },
    {
      $set: {
        status: "WITHDRAWN",
        withdrawnAt: new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Application not found.");

  await Promise.all([
    OpportunityModel.updateOne(
      { _id: application.opportunityId },
      { $inc: { applicationCount: -1 } },
    ),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(application.universityId),
      action: "APPLICATION_WITHDRAWN",
      entityType: "application",
      entityId: applicationId,
      before: serializeApplication(application as Record<string, unknown>),
      after: serializeApplication(updated as Record<string, unknown>),
    }),
    recordApplicationStatusEvent({
      application: updated as Record<string, unknown>,
      opportunity: opportunity as Record<string, unknown>,
      changedById: actor.id,
      fromStatus:
        typeof application.status === "string" ? application.status : null,
      toStatus: "WITHDRAWN",
    }),
    createSystemNotification({
      target: {
        recipientId: String(opportunity.employerId ?? opportunity.postedById),
      },
      senderId: actor.id,
      type: "OPPORTUNITY",
      title: "Application withdrawn",
      message: `${await getActorName(actor)} withdrew an application for ${String(opportunity.title)}.`,
      entityType: "application",
      entityId: applicationId,
      actionUrl: `/employer/opportunities/${String(opportunity._id)}/applications`,
      priority: "NORMAL",
      metadata: { opportunityId: opportunity._id },
    }),
  ]);

  return serializeApplication(updated as Record<string, unknown>);
}

function auditActionForStatus(status: HiringStatus): AuditAction {
  if (status === "SHORTLISTED") return "APPLICATION_SHORTLISTED";
  if (status === "INTERVIEW") return "APPLICATION_INTERVIEW";
  if (status === "REJECTED") return "APPLICATION_REJECTED";
  if (status === "HIRED") return "APPLICATION_HIRED";

  return "APPLICATION_REVIEWED";
}

async function transitionApplication(
  applicationId: string,
  status: HiringStatus,
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectPostgres();
  const notePayload = applicationTransitionNoteSchema.parse(input);
  const { application, opportunity } = await getApplicationWithOpportunity(
    applicationId,
    actor,
  );

  if (!canEmployerReview(actor, opportunity as Record<string, unknown>)) {
    throw forbidden("Only the employer can review this application.");
  }
  if (application.status === "WITHDRAWN") {
    throw forbidden("Withdrawn applications cannot be reviewed.");
  }

  const metadata =
    typeof application.metadata === "object" && application.metadata
      ? (application.metadata as Record<string, unknown>)
      : {};
  const updated = await ApplicationModel.findOneAndUpdate(
    { _id: applicationId, ...deletedFilter },
    {
      $set: {
        status,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        updatedById: actor.id,
        metadata: {
          ...metadata,
          reviewNote: notePayload.note ?? null,
        },
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Application not found.");

  await Promise.all([
    notifyApplicationStatus({
      recipientId: String(application.studentId ?? application.applicantId),
      senderId: actor.id,
      applicationId,
      opportunity: opportunity as Record<string, unknown>,
      status,
      note: notePayload.note,
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(application.universityId),
      action: auditActionForStatus(status),
      entityType: "application",
      entityId: applicationId,
      before: serializeApplication(application as Record<string, unknown>),
      after: serializeApplication(updated as Record<string, unknown>),
    }),
    recordApplicationStatusEvent({
      application: updated as Record<string, unknown>,
      opportunity: opportunity as Record<string, unknown>,
      changedById: actor.id,
      fromStatus:
        typeof application.status === "string" ? application.status : null,
      toStatus: status,
      note: notePayload.note,
    }),
  ]);

  return serializeApplication(updated as Record<string, unknown>);
}

export async function reviewApplication(
  applicationId: string,
  input: unknown = {},
) {
  const payload = applicationReviewSchema.parse(input);

  return transitionApplication(applicationId, payload.status, {
    note: payload.note,
  });
}

export function markApplicationUnderReview(
  applicationId: string,
  input: unknown = {},
) {
  return transitionApplication(applicationId, "UNDER_REVIEW", input);
}

export function shortlistApplication(
  applicationId: string,
  input: unknown = {},
) {
  return transitionApplication(applicationId, "SHORTLISTED", input);
}

export function interviewApplication(
  applicationId: string,
  input: unknown = {},
) {
  return transitionApplication(applicationId, "INTERVIEW", input);
}

export function rejectApplication(applicationId: string, input: unknown = {}) {
  return transitionApplication(applicationId, "REJECTED", input);
}

export function hireApplication(applicationId: string, input: unknown = {}) {
  return transitionApplication(applicationId, "HIRED", input);
}
