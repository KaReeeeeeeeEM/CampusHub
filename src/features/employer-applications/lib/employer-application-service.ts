import { createHash, randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { ROLES } from "@/features/authorization/roles";
import type {
  EmployerActivationInput,
  EmployerApplicationInput,
  EmployerApplicationReviewInput,
} from "@/features/employer-applications/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import { connectPostgres } from "@/lib/db/postgres";
import { EmployerApplicationModel, UserModel } from "@/lib/db/models";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import type { AuthSession } from "@/types/auth";

const activationTokenTtlMs = 1000 * 60 * 60 * 24 * 7;

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createActivationToken() {
  return randomBytes(32).toString("base64url");
}

function createTemporaryPassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

function hasNonEmployerRole(user: {
  roles?: string[] | null;
  role?: string | null;
}) {
  const roles = user.roles?.length ? user.roles : user.role ? [user.role] : [];

  return roles.some((role) => role !== "EMPLOYER");
}

async function requireSuperAdminSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })) as AuthSession | null;

  if (!session) {
    throw new Error("Authentication required.");
  }

  if (
    session.user.role !== "SUPER_ADMIN" &&
    !session.user.roles?.includes("SUPER_ADMIN")
  ) {
    throw new Error("Super Admin access required.");
  }

  return session;
}

export async function submitEmployerApplication(
  input: EmployerApplicationInput,
) {
  await connectPostgres();

  const existingUser = await UserModel.findOne({
    email: input.email.toLowerCase(),
  }).lean();

  if (existingUser && hasNonEmployerRole(existingUser)) {
    throw new Error(
      "This email already belongs to a non-employer CampusHub account.",
    );
  }

  const activeApplication = await EmployerApplicationModel.findOne({
    email: input.email.toLowerCase(),
    status: { $in: ["PENDING", "APPROVED"] },
  }).lean();

  if (activeApplication) {
    throw new Error(
      "An employer application for this email is already active.",
    );
  }

  const application = await EmployerApplicationModel.create({
    _id: randomUUID(),
    companyName: input.companyName,
    industry: input.industry,
    companySize: input.companySize,
    website: input.website || null,
    contactPerson: input.contactPerson,
    position: input.position,
    email: input.email.toLowerCase(),
    phone: input.phone,
    country: input.country,
    reasonForJoining: input.reasonForJoining,
    description: input.reasonForJoining,
    status: "PENDING",
  });

  await writeAuditLog({
    actorId: null,
    action: "EMPLOYER_APPLICATION_SUBMITTED",
    entityType: "employer_application",
    entityId: String(application._id),
    after: application.toObject(),
  });

  return application.toObject();
}

export async function getEmployerApplications() {
  await requireSuperAdminSession();
  await connectPostgres();

  return EmployerApplicationModel.find().sort({ createdAt: -1 }).lean();
}

export async function reviewEmployerApplication(
  applicationId: string,
  input: EmployerApplicationReviewInput,
) {
  const session = await requireSuperAdminSession();
  await connectPostgres();

  const application = await EmployerApplicationModel.findById(applicationId);

  if (!application) {
    throw new Error("Employer application not found.");
  }

  if (input.action === "approve") {
    const existingUser = await UserModel.findOne({
      email: application.email,
    }).lean();

    if (existingUser && hasNonEmployerRole(existingUser)) {
      throw new Error(
        "This email already belongs to a non-employer CampusHub account.",
      );
    }

    const token = createActivationToken();
    const activationUrl = new URL(
      `/employers/activate/${token}`,
      getAppBaseUrl(),
    );

    application.status = "APPROVED";
    application.reviewNotes = input.reviewNotes || null;
    application.reviewedByUserId = session.user.id;
    application.reviewedBy = session.user.id;
    application.reviewedAt = new Date();
    application.activationTokenHash = hashToken(token);
    application.activationTokenExpiresAt = new Date(
      Date.now() + activationTokenTtlMs,
    );
    application.activationInvitationSentAt = new Date();

    await application.save();

    let employerUserId = existingUser?._id ? String(existingUser._id) : null;

    if (!employerUserId) {
      const response = await auth.api.signUpEmail({
        body: {
          name: application.contactPerson,
          email: application.email,
          password: createTemporaryPassword(),
          callbackURL: "/verification-success",
          intendedRole: ROLES.EMPLOYER,
          acquisitionSource: "EMPLOYER_ACTIVATION",
          acquisitionToken: getAcquisitionSecret(),
        },
      });

      employerUserId = response.user.id;
      application.employerUserId = employerUserId;
      await application.save();
    }

    await writeAuditLog({
      actorId: session.user.id,
      action: "EMPLOYER_APPROVED",
      entityType: "employer_application",
      entityId: String(application._id),
      after: {
        status: "APPROVED",
        employerUserId,
      },
    });
    await emitNotificationEvent({
      type: "EMPLOYER_APPROVED",
      actorId: session.user.id,
      recipientId: employerUserId,
      recipientEmail: application.email,
      entityType: "employer_application",
      entityId: String(application._id),
    });

    console.info("CampusHub employer activation invitation generated", {
      applicationId: application._id,
      email: application.email,
      activationUrl: activationUrl.toString(),
    });

    return {
      application: application.toObject(),
      activationUrl: activationUrl.toString(),
    };
  }

  application.status = "REJECTED";
  application.reviewNotes = input.reviewNotes || null;
  application.reviewedByUserId = session.user.id;
  application.reviewedBy = session.user.id;
  application.reviewedAt = new Date();
  await application.save();

  await writeAuditLog({
    actorId: session.user.id,
    action: "EMPLOYER_REJECTED",
    entityType: "employer_application",
    entityId: String(application._id),
    after: {
      status: "REJECTED",
      reviewNotes: application.reviewNotes,
    },
  });
  await emitNotificationEvent({
    type: "EMPLOYER_REJECTED",
    actorId: session.user.id,
    recipientEmail: application.email,
    entityType: "employer_application",
    entityId: String(application._id),
  });

  return {
    application: application.toObject(),
    activationUrl: null,
  };
}

export async function resolveEmployerActivation(token: string) {
  await connectPostgres();

  const application = await EmployerApplicationModel.findOne({
    activationTokenHash: hashToken(token),
    status: "APPROVED",
  }).lean();

  if (!application) {
    return { status: "invalid" as const };
  }

  if (application.activationUsedAt) {
    return { status: "used" as const, application };
  }

  if (
    application.activationTokenExpiresAt &&
    application.activationTokenExpiresAt.getTime() < Date.now()
  ) {
    return { status: "expired" as const, application };
  }

  return { status: "valid" as const, application };
}

export async function activateEmployerAccount(input: EmployerActivationInput) {
  const resolution = await resolveEmployerActivation(input.token);

  if (resolution.status !== "valid") {
    return {
      ok: false as const,
      status: resolution.status,
    };
  }

  const application = resolution.application;
  const existingUser = await UserModel.findOne({
    email: application.email,
  }).lean();

  if (existingUser && hasNonEmployerRole(existingUser)) {
    throw new Error(
      "This email already belongs to a non-employer CampusHub account.",
    );
  }

  if (existingUser) {
    await EmployerApplicationModel.updateOne(
      { _id: application._id, activationUsedAt: null },
      {
        $set: {
          activationUsedAt: new Date(),
          employerUserId: existingUser._id,
        },
      },
    );

    return {
      ok: true as const,
      userId: String(existingUser._id),
    };
  }

  const response = await auth.api.signUpEmail({
    body: {
      name: application.contactPerson,
      email: application.email,
      password: input.password,
      callbackURL: "/verification-success",
      intendedRole: ROLES.EMPLOYER,
      acquisitionSource: "EMPLOYER_ACTIVATION",
      acquisitionToken: getAcquisitionSecret(),
    },
  });

  await EmployerApplicationModel.updateOne(
    { _id: application._id, activationUsedAt: null },
    {
      $set: {
        activationUsedAt: new Date(),
        employerUserId: response.user.id,
      },
    },
  );

  return {
    ok: true as const,
    userId: response.user.id,
  };
}
