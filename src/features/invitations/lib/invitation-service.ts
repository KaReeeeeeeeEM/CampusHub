import { randomBytes, randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import {
  acceptInvitedAccountSchema,
  acceptStudentInvitationSchema,
  createCampusAdminInvitationSchema,
  createRepresentativeInvitationSchema,
  createStudentInvitationSchema,
  type AcceptInvitedAccountInput,
  type AcceptStudentInvitationInput,
  type CreateCampusAdminInvitationInput,
  type CreateRepresentativeInvitationInput,
  type CreateStudentInvitationInput,
} from "@/features/invitations/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import {
  requireAuthorizedResource,
  requirePermission,
} from "@/lib/auth/authorization";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CampusAdminInvitationModel,
  CollegeModel,
  InvitationModel,
  JoinInvitationModel,
  RepresentativeModel,
  RepresentativeInvitationModel,
  TeacherInvitationModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import { ApiError } from "@/lib/errors/api-error";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import type { AuthUser } from "@/types/auth";

const invitationTokenBytes = 32;
const msPerDay = 1000 * 60 * 60 * 24;

function createInvitationToken() {
  return randomBytes(invitationTokenBytes).toString("base64url");
}

function getExpiresAt(days: number) {
  return new Date(Date.now() + days * msPerDay);
}

function isExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

async function getUniqueInvitationToken() {
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const token = createInvitationToken();
    const existing = await InvitationModel.exists({ token });

    if (!existing) {
      return token;
    }
  }

  throw new Error("Unable to generate a unique invitation token.");
}

async function assertActiveUniversity(universityId: string) {
  const university = await UniversityModel.findOne({
    _id: universityId,
    status: "ACTIVE",
  }).lean();

  if (!university) {
    throw new Error("Active university is required.");
  }

  return university;
}

async function assertActiveCollege(universityId: string, collegeId: string) {
  const college = await CollegeModel.findOne({
    _id: collegeId,
    universityId,
    status: "ACTIVE",
  }).lean();

  if (!college) {
    throw new Error("Active college in the selected university is required.");
  }

  return college;
}

async function ensureEmailCanJoin(email: string) {
  const existing = await UserModel.findOne({
    email: email.toLowerCase(),
  }).lean();

  if (existing) {
    throw new ApiError({
      statusCode: 409,
      code: "EMAIL_ALREADY_REGISTERED",
      message: "A CampusHub account already exists for this email.",
    });
  }
}

async function ensureUsernameCanJoin(username: string) {
  const existing = await UserModel.findOne({
    username: username.toLowerCase(),
  }).lean();

  if (existing) {
    throw new ApiError({
      statusCode: 409,
      code: "USERNAME_ALREADY_REGISTERED",
      message: "This username is already taken.",
    });
  }
}

async function ensureNoPendingInvitation(email: string, type: string) {
  const invitation = await InvitationModel.findOne({
    email: email.toLowerCase(),
    type,
    status: "PENDING",
  }).lean();

  if (invitation) {
    throw new ApiError({
      statusCode: 409,
      code: "PENDING_INVITATION_EXISTS",
      message: "A pending invitation already exists for this email.",
    });
  }
}

function isSuperAdmin(actor: AuthUser) {
  return actor.role === "SUPER_ADMIN" || actor.roles?.includes("SUPER_ADMIN");
}

function mapAccountCreationError(error: unknown): never {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unable to create the invited account.";

  throw new ApiError({
    statusCode: 400,
    code: "ACCOUNT_CREATION_FAILED",
    message,
  });
}

async function getRepresentativeActorProfile(actor: AuthUser) {
  const representative = await RepresentativeModel.findOne({
    userId: actor.id,
    universityId: actor.universityId,
    collegeId: actor.collegeId,
    status: "ACTIVE",
  }).lean();

  if (!representative) {
    throw new Error("Active representative profile is required.");
  }

  return representative;
}

export async function createStudentInvitation(
  input: CreateStudentInvitationInput,
) {
  const payload = createStudentInvitationSchema.parse(input);
  const actor = await requireAuthorizedResource({
    permission: PERMISSIONS.INVITATION_CREATE,
    resource: {
      universityId: payload.universityId,
      collegeId: payload.collegeId,
    },
  });

  await connectMongo();

  await assertActiveUniversity(payload.universityId);
  await assertActiveCollege(payload.universityId, payload.collegeId);

  if (
    actor.universityId !== payload.universityId ||
    actor.collegeId !== payload.collegeId
  ) {
    throw new Error(
      "Representative can only invite students to their college.",
    );
  }

  const representative = await getRepresentativeActorProfile(actor);
  const invitation = await InvitationModel.create({
    _id: randomUUID(),
    token: await getUniqueInvitationToken(),
    type: "STUDENT_INVITATION",
    email: null,
    universityId: payload.universityId,
    collegeId: payload.collegeId,
    departmentId: null,
    representativeId: String(representative._id),
    role: "STUDENT",
    position: "NONE",
    createdBy: actor.id,
    expiresAt: getExpiresAt(payload.expiresInDays),
    status: "PENDING",
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: payload.universityId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: String(invitation._id),
    after: invitation.toObject(),
  });
  await emitNotificationEvent({
    type: "INVITATION_CREATED",
    universityId: payload.universityId,
    actorId: actor.id,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return invitation.toObject();
}

export async function createRepresentativeInvitation(
  input: CreateRepresentativeInvitationInput,
) {
  const payload = createRepresentativeInvitationSchema.parse(input);
  const actor = await requireAuthorizedResource({
    permission: PERMISSIONS.USER_ASSIGN_POSITION,
    resource: {
      universityId: payload.universityId,
      collegeId: payload.collegeId,
    },
  });

  await connectMongo();

  await ensureEmailCanJoin(payload.email);
  await ensureNoPendingInvitation(payload.email, "REPRESENTATIVE_INVITATION");
  await assertActiveUniversity(payload.universityId);
  await assertActiveCollege(payload.universityId, payload.collegeId);

  const invitation = await InvitationModel.create({
    _id: randomUUID(),
    token: await getUniqueInvitationToken(),
    type: "REPRESENTATIVE_INVITATION",
    email: payload.email.toLowerCase(),
    universityId: payload.universityId,
    collegeId: payload.collegeId,
    departmentId: null,
    role: "STUDENT",
    position: "REPRESENTATIVE",
    createdBy: actor.id,
    expiresAt: getExpiresAt(payload.expiresInDays),
    status: "PENDING",
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: payload.universityId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: String(invitation._id),
    after: invitation.toObject(),
  });
  await emitNotificationEvent({
    type: "INVITATION_CREATED",
    universityId: payload.universityId,
    actorId: actor.id,
    recipientEmail: payload.email,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return invitation.toObject();
}

export async function createCampusAdminInvitation(
  input: CreateCampusAdminInvitationInput,
) {
  const payload = createCampusAdminInvitationSchema.parse(input);
  const actor = await requirePermission(PERMISSIONS.USER_ASSIGN_ROLE);

  await connectMongo();

  if (!isSuperAdmin(actor)) {
    throw new Error("Only Super Admin can invite Campus Admin users.");
  }

  await ensureEmailCanJoin(payload.email);
  await ensureNoPendingInvitation(payload.email, "CAMPUS_ADMIN_INVITATION");
  await assertActiveUniversity(payload.universityId);

  const invitation = await InvitationModel.create({
    _id: randomUUID(),
    token: await getUniqueInvitationToken(),
    type: "CAMPUS_ADMIN_INVITATION",
    email: payload.email.toLowerCase(),
    universityId: payload.universityId,
    collegeId: null,
    departmentId: null,
    role: "CAMPUS_ADMIN",
    position: "NONE",
    createdBy: actor.id,
    expiresAt: getExpiresAt(payload.expiresInDays),
    status: "PENDING",
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: payload.universityId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: String(invitation._id),
    after: invitation.toObject(),
  });
  await emitNotificationEvent({
    type: "INVITATION_CREATED",
    universityId: payload.universityId,
    actorId: actor.id,
    recipientEmail: payload.email,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return invitation.toObject();
}

export async function resolveInvitation(token: string) {
  await connectMongo();

  const invitation = await InvitationModel.findOne({ token }).lean();

  if (!invitation) {
    return { status: "invalid" as const };
  }

  if (invitation.status !== "PENDING") {
    return {
      status: invitation.status.toLowerCase() as
        | "accepted"
        | "expired"
        | "revoked",
      invitation,
    };
  }

  if (isExpired(invitation.expiresAt)) {
    await InvitationModel.updateOne(
      { _id: invitation._id, status: "PENDING" },
      { $set: { status: "EXPIRED" } },
    );

    return { status: "expired" as const, invitation };
  }

  return { status: "valid" as const, invitation };
}

export async function acceptStudentInvitation(
  input: AcceptStudentInvitationInput,
) {
  const payload = acceptStudentInvitationSchema.parse(input);
  const resolution = await resolveInvitation(payload.token);

  if (resolution.status !== "valid") {
    return { ok: false as const, status: resolution.status };
  }

  const invitation = resolution.invitation;

  if (invitation.type !== "STUDENT_INVITATION") {
    throw new Error("Student invitation is required.");
  }

  await ensureEmailCanJoin(payload.email);
  await ensureUsernameCanJoin(payload.username);

  const name = [payload.firstName, payload.otherNames, payload.lastName]
    .filter(Boolean)
    .join(" ");
  const response = await auth.api
    .signUpEmail({
      body: {
        name,
        email: payload.email.toLowerCase(),
        password: payload.password,
        callbackURL: "/verification-success",
        intendedRole: "STUDENT",
        username: payload.username,
        firstName: payload.firstName,
        lastName: payload.lastName,
        otherNames: payload.otherNames ?? "",
        nickname: payload.nickname ?? "",
        universityId: invitation.universityId,
        collegeId: invitation.collegeId,
        acquisitionSource: "STUDENT_INVITATION",
        acquisitionToken: getAcquisitionSecret(),
      },
    })
    .catch(mapAccountCreationError);

  await InvitationModel.updateOne(
    { _id: invitation._id, status: "PENDING" },
    {
      $set: {
        acceptedAt: new Date(),
        acceptedBy: response.user.id,
        email: payload.email.toLowerCase(),
        status: "ACCEPTED",
      },
    },
  );
  await writeAuditLog({
    actorId: response.user.id,
    universityId: invitation.universityId,
    action: "INVITATION_ACCEPTED",
    entityType: "invitation",
    entityId: String(invitation._id),
  });
  await emitNotificationEvent({
    type: "INVITATION_ACCEPTED",
    universityId: invitation.universityId,
    actorId: response.user.id,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return { ok: true as const, userId: response.user.id };
}

export async function acceptInvitedAccount(input: AcceptInvitedAccountInput) {
  const payload = acceptInvitedAccountSchema.parse(input);
  const resolution = await resolveInvitation(payload.token);

  if (resolution.status !== "valid") {
    return { ok: false as const, status: resolution.status };
  }

  const invitation = resolution.invitation;

  if (
    invitation.type !== "REPRESENTATIVE_INVITATION" &&
    invitation.type !== "TEACHER_INVITATION" &&
    invitation.type !== "CAMPUS_ADMIN_INVITATION"
  ) {
    throw new Error("Account invitation is required.");
  }

  const email = (invitation.email ?? payload.email).toLowerCase();

  await ensureEmailCanJoin(email);
  await ensureUsernameCanJoin(payload.username);

  const name = [payload.firstName, payload.otherNames, payload.lastName]
    .filter(Boolean)
    .join(" ");
  const response = await auth.api
    .signUpEmail({
      body: {
        name,
        email,
        password: payload.password,
        callbackURL: "/verification-success",
        intendedRole: invitation.role,
        username: payload.username,
        firstName: payload.firstName,
        lastName: payload.lastName,
        otherNames: payload.otherNames ?? "",
        nickname: payload.nickname ?? "",
        universityId: invitation.universityId,
        collegeId: invitation.collegeId ?? undefined,
        departmentId: invitation.departmentId ?? undefined,
        acquisitionSource: invitation.type,
        acquisitionToken: getAcquisitionSecret(),
      },
    })
    .catch(mapAccountCreationError);

  await InvitationModel.updateOne(
    { _id: invitation._id, status: "PENDING" },
    {
      $set: {
        acceptedAt: new Date(),
        acceptedBy: response.user.id,
        email,
        status: "ACCEPTED",
      },
    },
  );
  if (invitation.type === "REPRESENTATIVE_INVITATION" && invitation.collegeId) {
    await RepresentativeModel.updateOne(
      { userId: response.user.id, universityId: invitation.universityId },
      {
        $set: {
          collegeId: invitation.collegeId,
          status: "ACTIVE",
        },
        $setOnInsert: {
          _id: randomUUID(),
          userId: response.user.id,
          universityId: invitation.universityId,
        },
      },
      { upsert: true },
    );
    await RepresentativeInvitationModel.updateOne(
      { invitationToken: invitation.token },
      { $set: { status: "ACCEPTED" } },
    );
  }
  if (invitation.type === "CAMPUS_ADMIN_INVITATION") {
    await CampusAdminInvitationModel.updateOne(
      { token: invitation.token },
      {
        $set: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      },
    );
  }
  if (invitation.type === "TEACHER_INVITATION") {
    await TeacherInvitationModel.updateOne(
      { invitationToken: invitation.token },
      { $set: { status: "ACCEPTED", email } },
    );
  }
  await writeAuditLog({
    actorId: response.user.id,
    universityId: invitation.universityId,
    action: "INVITATION_ACCEPTED",
    entityType: "invitation",
    entityId: String(invitation._id),
  });
  await emitNotificationEvent({
    type: "INVITATION_ACCEPTED",
    universityId: invitation.universityId,
    actorId: response.user.id,
    recipientEmail: email,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return { ok: true as const, userId: response.user.id };
}

export async function revokeInvitation(invitationId: string) {
  const actor = await requirePermission(PERMISSIONS.INVITATION_DELETE);
  await connectMongo();

  const invitation = await InvitationModel.findOne({
    _id: invitationId,
    status: "PENDING",
  });

  if (!invitation) {
    throw new Error("Pending invitation not found.");
  }

  if (
    actor.role !== "SUPER_ADMIN" &&
    actor.universityId !== invitation.universityId
  ) {
    throw new Error("You cannot revoke an invitation from another university.");
  }

  invitation.status = "REVOKED";
  invitation.revokedAt = new Date();
  invitation.revokedBy = actor.id;
  await invitation.save();

  if (invitation.type === "STUDENT_INVITATION") {
    await JoinInvitationModel.updateOne(
      { token: invitation.token },
      {
        $set: {
          status: "DISABLED",
          disabledAt: invitation.revokedAt,
        },
      },
    );
  }
  if (invitation.type === "REPRESENTATIVE_INVITATION") {
    await RepresentativeInvitationModel.updateOne(
      { invitationToken: invitation.token },
      { $set: { status: "DISABLED" } },
    );
  }
  if (invitation.type === "TEACHER_INVITATION") {
    await TeacherInvitationModel.updateOne(
      { invitationToken: invitation.token },
      { $set: { status: "DISABLED" } },
    );
  }
  if (invitation.type === "CAMPUS_ADMIN_INVITATION") {
    await CampusAdminInvitationModel.updateOne(
      { token: invitation.token },
      { $set: { status: "DISABLED" } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: invitation.universityId,
    action: "INVITATION_REVOKED",
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return invitation.toObject();
}
