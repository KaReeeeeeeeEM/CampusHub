import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import {
  isLegacyStudentLeadershipRoleKey,
  isRoleKey,
  isStudentLeadershipPosition,
} from "@/features/authorization/roles";
import { connectPostgres } from "@/lib/db/postgres";
import {
  CollegeModel,
  CourseModel,
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
  departmentId: string | null;
  departmentName: string | null;
  courseId: string | null;
  courseName: string | null;
  yearOfStudy: number | null;
  expectedGraduationYear: number | null;
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
  courses: Array<{
    id: string;
    name: string;
    code: string;
    departmentId: string;
    departmentName: string;
    durationYears: number;
  }>;
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
    departmentName,
    courseName,
  }: {
    universityName: string;
    collegeName: string;
    departmentName?: string | null;
    courseName?: string | null;
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
    departmentId:
      typeof invitation.departmentId === "string"
        ? invitation.departmentId
        : null,
    departmentName: departmentName ?? null,
    courseId:
      typeof invitation.courseId === "string" ? invitation.courseId : null,
    courseName: courseName ?? null,
    yearOfStudy:
      typeof invitation.yearOfStudy === "number"
        ? invitation.yearOfStudy
        : null,
    expectedGraduationYear:
      typeof invitation.expectedGraduationYear === "number"
        ? invitation.expectedGraduationYear
        : null,
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
  await connectPostgres();

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
  await connectPostgres();

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
  const course = await CourseModel.findOne({
    _id: input.courseId,
    universityId: input.universityId,
    collegeId: input.collegeId,
    status: "ACTIVE",
    deletedAt: null,
  }).lean();

  if (!course) {
    throw new Error("Active course is required.");
  }
  if (input.yearOfStudy > Number(course.durationYears ?? 1)) {
    throw new Error("Year of study cannot exceed the course duration.");
  }

  const department = await DepartmentModel.findById(course.departmentId).lean();
  const enrollmentYear = new Date().getFullYear() - input.yearOfStudy + 1;
  const expectedGraduationYear =
    enrollmentYear + Number(course.durationYears ?? 1);

  const representative = await getRepresentativeProfile(session.user, input);
  const invitation = await JoinInvitationModel.create({
    _id: randomUUID(),
    token: createInvitationToken(),
    type: "STUDENT",
    universityId: input.universityId,
    collegeId: input.collegeId,
    departmentId: course.departmentId,
    courseId: input.courseId,
    yearOfStudy: input.yearOfStudy,
    enrollmentYear,
    expectedGraduationYear,
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
    departmentId: course.departmentId,
    courseId: input.courseId,
    yearOfStudy: input.yearOfStudy,
    enrollmentYear,
    expectedGraduationYear,
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
      courseDurationYears: course.durationYears,
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
    departmentName: department ? String(department.name) : null,
    courseName: String(course.name),
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

  const [university, college, department, course] = await Promise.all([
    UniversityModel.findById(invitation.universityId).lean(),
    CollegeModel.findById(invitation.collegeId).lean(),
    invitation.departmentId
      ? DepartmentModel.findById(invitation.departmentId).lean()
      : null,
    invitation.courseId ? CourseModel.findById(invitation.courseId).lean() : null,
  ]);

  return serializeStudentInvitation(invitation, {
    universityName: university ? String(university.name) : "Unknown university",
    collegeName: college ? String(college.name) : "Unknown college",
    departmentName: department ? String(department.name) : null,
    courseName: course ? String(course.name) : null,
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
    departmentId: existingInvitation.departmentId,
    courseId: existingInvitation.courseId,
    yearOfStudy: existingInvitation.yearOfStudy,
    enrollmentYear: existingInvitation.enrollmentYear,
    expectedGraduationYear: existingInvitation.expectedGraduationYear,
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

  const [university, college, department, course] = await Promise.all([
    UniversityModel.findById(invitation.universityId).lean(),
    CollegeModel.findById(invitation.collegeId).lean(),
    invitation.departmentId
      ? DepartmentModel.findById(invitation.departmentId).lean()
      : null,
    invitation.courseId ? CourseModel.findById(invitation.courseId).lean() : null,
  ]);

  return serializeStudentInvitation(invitation.toObject(), {
    universityName: university ? String(university.name) : "Unknown university",
    collegeName: college ? String(college.name) : "Unknown college",
    departmentName: department ? String(department.name) : null,
    courseName: course ? String(course.name) : null,
  });
}

export async function getRepresentativeInvitationPageData(): Promise<RepresentativeInvitationPageData> {
  const session = await requireRepresentativeSession();
  const representative = await getRepresentativeProfile(session.user);

  const [university, college, invitations, courses, departments] =
    await Promise.all([
    UniversityModel.findById(representative.universityId).lean(),
    CollegeModel.findById(representative.collegeId).lean(),
    JoinInvitationModel.find({
      representativeId: representative._id,
    })
      .sort({ createdAt: -1 })
      .lean(),
      CourseModel.find({
        universityId: representative.universityId,
        collegeId: representative.collegeId,
        status: "ACTIVE",
        deletedAt: null,
      })
        .sort({ name: 1 })
        .lean(),
      DepartmentModel.find({
        universityId: representative.universityId,
        collegeId: representative.collegeId,
        status: "ACTIVE",
        deletedAt: null,
      })
        .select({ name: 1 })
        .lean(),
    ]);

  const universityName = university
    ? String(university.name)
    : "Unknown university";
  const collegeName = college ? String(college.name) : "Unknown college";
  const departmentNames = new Map(
    departments.map((department) => [
      String(department._id),
      String(department.name),
    ]),
  );
  const courseNames = new Map(
    courses.map((course) => [String(course._id), String(course.name)]),
  );

  return {
    scope: {
      universityId: String(representative.universityId),
      universityName,
      collegeId: String(representative.collegeId),
      collegeName,
    },
    courses: courses.map((course) => ({
      id: String(course._id),
      name: String(course.name),
      code: String(course.code),
      departmentId: String(course.departmentId),
      departmentName:
        departmentNames.get(String(course.departmentId)) ?? "Unknown department",
      durationYears: Number(course.durationYears ?? 1),
    })),
    invitations: invitations.map((invitation) =>
      serializeStudentInvitation(invitation, {
        universityName,
        collegeName,
        departmentName: invitation.departmentId
          ? departmentNames.get(String(invitation.departmentId)) ?? null
          : null,
        courseName: invitation.courseId
          ? courseNames.get(String(invitation.courseId)) ?? null
          : null,
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
  await connectPostgres();

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

  const [university, college, representative, representativeUser, departments, course] =
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
      invitation.courseId ? CourseModel.findById(invitation.courseId).lean() : null,
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
    course: course
      ? {
          id: String(course._id),
          name: String(course.name),
          code: String(course.code),
          departmentId: String(course.departmentId),
          durationYears: Number(course.durationYears ?? 1),
        }
      : null,
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
      departmentId: resolution.invitation.departmentId,
      courseId: resolution.invitation.courseId,
      invitationId: resolution.invitation._id,
      representativeId: resolution.representative._id,
      firstName: input.firstName,
      lastName: input.lastName,
      otherNames: input.otherNames || null,
      nickname: input.nickname || null,
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      department:
        resolution.departments.find(
          (department) =>
            department.id === String(resolution.invitation.departmentId),
        )?.name ?? "Not assigned",
      yearOfStudy: resolution.invitation.yearOfStudy,
      enrollmentYear: resolution.invitation.enrollmentYear,
      expectedGraduationYear: resolution.invitation.expectedGraduationYear,
      status: "PENDING_VERIFICATION",
    }),
    UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          departmentId: resolution.invitation.departmentId,
          primaryDepartmentId: resolution.invitation.departmentId,
          courseId: resolution.invitation.courseId,
          yearOfStudy: resolution.invitation.yearOfStudy,
          enrollmentYear: resolution.invitation.enrollmentYear,
          expectedGraduationYear: resolution.invitation.expectedGraduationYear,
        },
      },
    ),
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
