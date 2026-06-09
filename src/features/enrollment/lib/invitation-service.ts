import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CollegeModel,
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

export type InvitationResolutionStatus =
  | "valid"
  | "invalid"
  | "expired"
  | "disabled"
  | "usage_exceeded";

type RepresentativeSessionUser = AuthSession["user"] & {
  id: string;
};

function createInvitationToken() {
  return randomBytes(18).toString("base64url");
}

function isRepresentative(user: RepresentativeSessionUser) {
  return (
    user.roles?.includes("REPRESENTATIVE") || user.role === "REPRESENTATIVE"
  );
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

  return invitation.toObject();
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

  return invitation;
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

  return invitation.toObject();
}

export async function getRepresentativeInvitations() {
  const session = await requireRepresentativeSession();
  const representative = await getRepresentativeProfile(session.user);

  return JoinInvitationModel.find({
    representativeId: representative._id,
  })
    .sort({ createdAt: -1 })
    .lean();
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

  const [university, college, representative, representativeUser] =
    await Promise.all([
      UniversityModel.findById(invitation.universityId).lean(),
      CollegeModel.findById(invitation.collegeId).lean(),
      RepresentativeModel.findById(invitation.representativeId).lean(),
      RepresentativeModel.findById(invitation.representativeId)
        .lean()
        .then((record) =>
          record ? UserModel.findById(record.userId).lean() : null,
        ),
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
  ]);

  return {
    ok: true as const,
    userId,
  };
}
