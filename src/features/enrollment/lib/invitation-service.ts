import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import {
  isLegacyStudentLeadershipRoleKey,
  isRoleKey,
  isStudentLeadershipPosition,
} from "@/features/authorization/roles";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CollegeModel,
  DepartmentModel,
  InvitationModel,
  JoinInvitationModel,
  RepresentativeModel,
  StudentModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import type {
  CreateInvitationInput,
  StudentInvitationRegistrationInput,
} from "@/features/enrollment/lib/schemas";
import type { AuthSession } from "@/types/auth";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";

export type InvitationResolutionStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "disabled"
  | "usage_exceeded";

type RepresentativeSessionUser = AuthSession["user"] & {
  id: string;
};

export type SerializedStudentInvitation = {
  id: string;
  token: string;
  universityId: string;
  universityName: string;
  collegeId: string;
  collegeName: string;
  status: "ACTIVE" | "DISABLED";
  invitationUrl: string;
  usageCount: number;
  maxUsageCount: number | null;
  expiresAt: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

export type RepresentativeInvitationPageData = {
  scope: {
    universityId: string;
    universityName: string;
    collegeId: string;
    collegeName: string;
  };
  invitations: SerializedStudentInvitation[];
};

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function createInvitationToken() {
  return randomBytes(18).toString("base64url");
}

function serializeDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serializeStudentInvitation(
  invitation: Record<string, unknown>,
  {
    universityName,
    collegeName,
  }: {
    universityName: string;
    collegeName: string;
  },
) {
  const token = String(invitation.token);

  return {
    id: String(invitation._id),
    token,
    universityId: String(invitation.universityId),
    universityName,
    collegeId: String(invitation.collegeId),
    collegeName,
    status:
      (invitation.status as SerializedStudentInvitation["status"]) ?? "ACTIVE",
    invitationUrl: new URL(`/join/${token}`, getAppBaseUrl()).toString(),
    usageCount: Number(invitation.usageCount ?? 0),
    maxUsageCount:
      typeof invitation.maxUsageCount === "number"
        ? invitation.maxUsageCount
        : null,
    expiresAt: serializeDate(invitation.expiresAt),
    createdAt: serializeDate(invitation.createdAt),
    lastUsedAt: serializeDate(invitation.lastUsedAt),
  } satisfies SerializedStudentInvitation;
}

function isRepresentative(user: RepresentativeSessionUser) {
  const roles = user.roles?.length ? user.roles : [user.role];
  const hasStudentRole = roles.filter(isRoleKey).includes("STUDENT");
  const hasRepresentativePosition = [
    ...(user.studentLeadershipPositions ?? []),
    ...(user.roles ?? []).filter(isLegacyStudentLeadershipRoleKey),
  ]
    .filter(isStudentLeadershipPosition)
    .includes("REPRESENTATIVE");

  return hasStudentRole && hasRepresentativePosition;
}

function isInvitationExpired(expiresAt?: Date | null) {
  return Boolean(expiresAt && expiresAt.getTime() < Date.now());
}

function hasExceededUsageLimit(invitation: {
  maxUsageCount?: number | null;
  usageCount?: number | null;
}) {
  return Boolean(
    invitation.maxUsageCount &&
    (invitation.usageCount ?? 0) >= invitation.maxUsageCount,
  );
}

async function requireRepresentativeSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as AuthSession | null;

  if (!session) {
    throw new Error("Authentication required.");
  }

  if (!isRepresentative(session.user)) {
    throw new Error("Representative access required.");
  }

  return session;
}

async function getRepresentativeProfile(
  user: RepresentativeSessionUser,
  input?: Pick<CreateInvitationInput, "universityId" | "collegeId">,
) {
  await connectMongo();

  const existingRepresentative = await RepresentativeModel.findOne({
    userId: user.id,
    status: "ACTIVE",
  }).lean();

  if (existingRepresentative) {
    return existingRepresentative;
  }

  if (!input?.universityId || !input.collegeId) {
    throw new Error("Representative profile is required.");
  }

  const representative = await RepresentativeModel.create({
    _id: randomUUID(),
    userId: user.id,
    universityId: input.universityId,
    collegeId: input.collegeId,
    status: "ACTIVE",
  });

  return representative.toObject();
}

export async function createStudentInvitation(input: CreateInvitationInput) {
  const session = await requireRepresentativeSession();
  await connectMongo();

  const [university, college] = await Promise.all([
    UniversityModel.findOne({ _id: input.universityId, status: "ACTIVE" }),
    CollegeModel.findOne({
      _id: input.collegeId,
      universityId: input.universityId,
      status: "ACTIVE",
    }),
  ]);

  if (!university || !college) {
    throw new Error("Active university and college are required.");
  }

  const representative = await getRepresentativeProfile(session.user, input);
  const invitation = await JoinInvitationModel.create({
    _id: randomUUID(),
    token: createInvitationToken(),
    type: "STUDENT",
    universityId: input.universityId,
    collegeId: input.collegeId,
    representativeId: representative._id,
    createdByUserId: session.user.id,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    maxUsageCount: input.maxUsageCount ?? null,
    usageCount: 0,
    status: "ACTIVE",
  });
  await InvitationModel.create({
    _id: randomUUID(),
    token: invitation.token,
    type: "STUDENT_INVITATION",
    email: null,
    universityId: input.universityId,
    collegeId: input.collegeId,
    departmentId: null,
    representativeId: String(representative._id),
    role: "STUDENT",
    position: "NONE",
    createdBy: session.user.id,
    expiresAt:
      invitation.expiresAt ?? new Date(Date.now() + 14 * 1000 * 60 * 60 * 24),
    status: "PENDING",
    metadata: {
      legacyInvitationId: invitation._id,
      maxUsageCount: invitation.maxUsageCount ?? null,
    },
  });
  await writeAuditLog({
    actorId: session.user.id,
    universityId: input.universityId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: String(invitation._id),
    after: invitation.toObject(),
  });
  await emitNotificationEvent({
    type: "INVITATION_CREATED",
    universityId: input.universityId,
    actorId: session.user.id,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return serializeStudentInvitation(invitation.toObject(), {
    universityName: String(university.name),
    collegeName: String(college.name),
  });
}

export async function disableInvitation(invitationId: string) {
  const session = await requireRepresentativeSession();
  const representative = await getRepresentativeProfile(session.user);

  const invitation = await JoinInvitationModel.findOneAndUpdate(
    {
      _id: invitationId,
      representativeId: representative._id,
      status: "ACTIVE",
    },
    {
      $set: {
        status: "DISABLED",
        disabledAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      token: invitation.token,
      type: "STUDENT_INVITATION",
      status: "PENDING",
    },
    {
      $set: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: session.user.id,
      },
    },
  );
  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(invitation.universityId),
    action: "INVITATION_REVOKED",
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  const [university, college] = await Promise.all([
    UniversityModel.findById(invitation.universityId).lean(),
    CollegeModel.findById(invitation.collegeId).lean(),
  ]);

  return serializeStudentInvitation(invitation, {
    universityName: university ? String(university.name) : "Unknown university",
    collegeName: college ? String(college.name) : "Unknown college",
  });
}

export async function regenerateInvitation(
  invitationId: string,
  options: Pick<CreateInvitationInput, "expiresAt" | "maxUsageCount"> = {},
) {
  const session = await requireRepresentativeSession();
  const representative = await getRepresentativeProfile(session.user);

  const existingInvitation = await JoinInvitationModel.findOne({
    _id: invitationId,
    representativeId: representative._id,
  }).lean();

  if (!existingInvitation) {
    throw new Error("Invitation not found.");
  }

  await JoinInvitationModel.updateOne(
    { _id: invitationId },
    {
      $set: {
        status: "DISABLED",
        disabledAt: new Date(),
      },
    },
  );

  const invitation = await JoinInvitationModel.create({
    _id: randomUUID(),
    token: createInvitationToken(),
    type: existingInvitation.type,
    universityId: existingInvitation.universityId,
    collegeId: existingInvitation.collegeId,
    representativeId: existingInvitation.representativeId,
    createdByUserId: session.user.id,
    expiresAt: options.expiresAt
      ? new Date(options.expiresAt)
      : existingInvitation.expiresAt,
    maxUsageCount: options.maxUsageCount ?? existingInvitation.maxUsageCount,
    usageCount: 0,
    status: "ACTIVE",
    regeneratedFromInvitationId: existingInvitation._id,
  });

  const [university, college] = await Promise.all([
    UniversityModel.findById(invitation.universityId).lean(),
    CollegeModel.findById(invitation.collegeId).lean(),
  ]);

  return serializeStudentInvitation(invitation.toObject(), {
    universityName: university ? String(university.name) : "Unknown university",
    collegeName: college ? String(college.name) : "Unknown college",
  });
}

export async function getRepresentativeInvitationPageData(): Promise<RepresentativeInvitationPageData> {
  const session = await requireRepresentativeSession();
  const representative = await getRepresentativeProfile(session.user);

  const [university, college, invitations] = await Promise.all([
    UniversityModel.findById(representative.universityId).lean(),
    CollegeModel.findById(representative.collegeId).lean(),
    JoinInvitationModel.find({
      representativeId: representative._id,
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const universityName = university
    ? String(university.name)
    : "Unknown university";
  const collegeName = college ? String(college.name) : "Unknown college";

  return {
    scope: {
      universityId: String(representative.universityId),
      universityName,
      collegeId: String(representative.collegeId),
      collegeName,
    },
    invitations: invitations.map((invitation) =>
      serializeStudentInvitation(invitation, {
        universityName,
        collegeName,
      }),
    ),
  };
}

export async function getRepresentativeInvitations() {
  const pageData = await getRepresentativeInvitationPageData();

  return pageData.invitations;
}

export async function getInvitationUsage(invitationId: string) {
  const session = await requireRepresentativeSession();
  const representative = await getRepresentativeProfile(session.user);

  const invitation = await JoinInvitationModel.findOne({
    _id: invitationId,
    representativeId: representative._id,
  }).lean();

  if (!invitation) {
    throw new Error("Invitation not found.");
  }

  const students = await StudentModel.find({ invitationId })
    .sort({ createdAt: -1 })
    .lean();

  return {
    invitation,
    stats: {
      usageCount: invitation.usageCount ?? 0,
      maxUsageCount: invitation.maxUsageCount ?? null,
      remainingUses: invitation.maxUsageCount
        ? Math.max(invitation.maxUsageCount - (invitation.usageCount ?? 0), 0)
        : null,
      studentsJoined: students.length,
    },
    students,
  };
}

export async function resolveInvitation(token: string) {
  await connectMongo();

  const invitation = await JoinInvitationModel.findOne({ token }).lean();

  if (!invitation) {
    return { status: "invalid" as const };
  }

  if (invitation.status !== "ACTIVE") {
    return { status: "disabled" as const, invitation };
  }

  if (isInvitationExpired(invitation.expiresAt)) {
    return { status: "expired" as const, invitation };
  }

  if (hasExceededUsageLimit(invitation)) {
    return { status: "usage_exceeded" as const, invitation };
  }

  const [university, college, representative, representativeUser, departments] =
    await Promise.all([
      UniversityModel.findById(invitation.universityId).lean(),
      CollegeModel.findById(invitation.collegeId).lean(),
      RepresentativeModel.findById(invitation.representativeId).lean(),
      RepresentativeModel.findById(invitation.representativeId)
        .lean()
        .then((record) =>
          record ? UserModel.findById(record.userId).lean() : null,
        ),
      DepartmentModel.find({
        universityId: invitation.universityId,
        collegeId: invitation.collegeId,
        status: "ACTIVE",
        deletedAt: null,
      })
        .sort({ name: 1 })
        .lean(),
    ]);

  if (!university || !college || !representative) {
    return { status: "invalid" as const, invitation };
  }

  return {
    status: "valid" as const,
    invitation,
    university,
    college,
    representative,
    representativeUser,
    departments: departments.map((department) => ({
      id: String(department._id),
      name: String(department.name),
      code: String(department.code),
    })),
  };
}

export async function enrollStudentFromInvitation(
  input: StudentInvitationRegistrationInput,
) {
  const resolution = await resolveInvitation(input.token);

  if (resolution.status !== "valid") {
    return {
      ok: false as const,
      status: resolution.status,
    };
  }

  const existingStudent = await StudentModel.findOne({
    $or: [
      { email: input.email.toLowerCase() },
      { username: input.username.toLowerCase() },
    ],
  }).lean();

  if (existingStudent) {
    throw new Error("A student already exists with this email or username.");
  }

  const fullName = [input.firstName, input.otherNames, input.lastName]
    .filter(Boolean)
    .join(" ");

  const response = await auth.api.signUpEmail({
    body: {
      name: fullName,
      email: input.email,
      password: input.password,
      callbackURL: "/verification-success",
      intendedRole: "STUDENT",
      acquisitionSource: "STUDENT_INVITATION",
      acquisitionToken: getAcquisitionSecret(),
      universityId: resolution.university._id,
      collegeId: resolution.college._id,
    },
  });

  const userId = response.user.id;

  await Promise.all([
    StudentModel.create({
      _id: randomUUID(),
      userId,
      universityId: resolution.university._id,
      collegeId: resolution.college._id,
      invitationId: resolution.invitation._id,
      representativeId: resolution.representative._id,
      firstName: input.firstName,
      lastName: input.lastName,
      otherNames: input.otherNames || null,
      nickname: input.nickname || null,
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      department: input.department,
      yearOfStudy: input.yearOfStudy,
      status: "PENDING_VERIFICATION",
    }),
    JoinInvitationModel.updateOne(
      {
        _id: resolution.invitation._id,
        status: "ACTIVE",
      },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      },
    ),
    InvitationModel.updateOne(
      {
        token: resolution.invitation.token,
        status: "PENDING",
      },
      {
        $set: {
          acceptedAt: new Date(),
          acceptedBy: userId,
          email: input.email.toLowerCase(),
          status: "ACCEPTED",
        },
      },
    ),
  ]);

  await writeAuditLog({
    actorId: userId,
    universityId: String(resolution.university._id),
    action: "INVITATION_ACCEPTED",
    entityType: "invitation",
    entityId: String(resolution.invitation._id),
  });
  await emitNotificationEvent({
    type: "INVITATION_ACCEPTED",
    universityId: String(resolution.university._id),
    actorId: userId,
    entityType: "invitation",
    entityId: String(resolution.invitation._id),
  });

  return {
    ok: true as const,
    userId,
  };
}
