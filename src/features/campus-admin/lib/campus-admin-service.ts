import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import type { RoleKey } from "@/features/authorization/roles";
import type {
  CollegeInput,
  DepartmentInput,
  RepresentativeInvitationInput,
  TeacherInvitationInput,
} from "@/features/campus-admin/lib/schemas";
import {
  collegeInputSchema,
  departmentInputSchema,
  representativeInvitationInputSchema,
  teacherInvitationInputSchema,
} from "@/features/campus-admin/lib/schemas";
import { auth } from "@/lib/auth/auth";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, unauthorized } from "@/lib/api/response";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CollegeModel,
  DepartmentModel,
  InvitationModel,
  RepresentativeInvitationModel,
  TeacherInvitationModel,
} from "@/lib/db/models";
import type { AuthSession } from "@/types/auth";
import { withUniversityFilter } from "@/lib/tenant/tenant-query";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import { ApiError } from "@/lib/errors/api-error";

const invitationTtlMs = 1000 * 60 * 60 * 24;
const deletedFilter = { deletedAt: null };

export type SerializedCollege = {
  id: string;
  universityId: string;
  name: string;
  code: string;
  shortName: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedDepartment = {
  id: string;
  universityId: string;
  collegeId: string;
  collegeName: string;
  name: string;
  code: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedRepresentativeInvitation = {
  id: string;
  universityId: string;
  collegeId: string;
  collegeName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: "SENT" | "ACCEPTED" | "EXPIRED" | "DISABLED";
  invitationUrl: string;
  expiresAt: string;
  createdAt: string | null;
};

export type SerializedTeacherInvitation = {
  id: string;
  universityId: string;
  departmentId: string;
  departmentName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: "SENT" | "ACCEPTED" | "EXPIRED" | "DISABLED";
  invitationUrl: string;
  expiresAt: string;
  createdAt: string | null;
};

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function resolveCollegeCode(payload: CollegeInput) {
  return normalizeCode(payload.code || payload.shortName || payload.name);
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function getRoles(session: AuthSession) {
  return session.user.roles?.length
    ? session.user.roles
    : ([session.user.role].filter(Boolean) as RoleKey[]);
}

export async function requireCampusAdminSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })) as AuthSession | null;

  if (!session) {
    throw unauthorized();
  }

  if (!getRoles(session).includes("CAMPUS_ADMIN")) {
    throw forbidden("Campus Admin access is required.");
  }

  if (!session.user.universityId) {
    throw forbidden("Campus Admin is not assigned to a university.");
  }

  return session;
}

function serializeCollege(college: Record<string, unknown>) {
  return {
    id: String(college._id),
    universityId: String(college.universityId),
    name: String(college.name),
    code: String(college.code),
    shortName: (college.shortName as string | null) ?? null,
    slug: String(college.slug),
    description: (college.description as string | null) ?? null,
    logo: (college.logo as string | null) ?? null,
    status: (college.status as SerializedCollege["status"]) ?? "ACTIVE",
    createdAt: serializeDate(college.createdAt),
    updatedAt: serializeDate(college.updatedAt),
  } satisfies SerializedCollege;
}

function serializeDepartment(
  department: Record<string, unknown>,
  collegeName: string,
) {
  return {
    id: String(department._id),
    universityId: String(department.universityId),
    collegeId: String(department.collegeId),
    collegeName,
    name: String(department.name),
    code: String(department.code),
    description: (department.description as string | null) ?? null,
    status: (department.status as SerializedDepartment["status"]) ?? "ACTIVE",
    createdAt: serializeDate(department.createdAt),
    updatedAt: serializeDate(department.updatedAt),
  } satisfies SerializedDepartment;
}

function serializeRepresentativeInvitation(
  invitation: Record<string, unknown>,
  collegeName: string,
) {
  const token = String(invitation.invitationToken);

  return {
    id: String(invitation._id),
    universityId: String(invitation.universityId),
    collegeId: String(invitation.collegeId),
    collegeName,
    firstName:
      typeof invitation.firstName === "string" ? invitation.firstName : null,
    lastName:
      typeof invitation.lastName === "string" ? invitation.lastName : null,
    email: typeof invitation.email === "string" ? invitation.email : null,
    phone: (invitation.phone as string | null) ?? null,
    status:
      (invitation.status as SerializedRepresentativeInvitation["status"]) ??
      "SENT",
    invitationUrl: new URL(
      `/representatives/activate/${token}`,
      getAppBaseUrl(),
    ).toString(),
    expiresAt:
      invitation.expiresAt instanceof Date
        ? invitation.expiresAt.toISOString()
        : new Date(String(invitation.expiresAt)).toISOString(),
    createdAt: serializeDate(invitation.createdAt),
  } satisfies SerializedRepresentativeInvitation;
}

function serializeTeacherInvitation(
  invitation: Record<string, unknown>,
  departmentName: string,
) {
  const token = String(invitation.invitationToken);

  return {
    id: String(invitation._id),
    universityId: String(invitation.universityId),
    departmentId: String(invitation.departmentId),
    departmentName,
    firstName:
      typeof invitation.firstName === "string" ? invitation.firstName : null,
    lastName:
      typeof invitation.lastName === "string" ? invitation.lastName : null,
    email: typeof invitation.email === "string" ? invitation.email : null,
    phone: (invitation.phone as string | null) ?? null,
    status:
      (invitation.status as SerializedTeacherInvitation["status"]) ?? "SENT",
    invitationUrl: new URL(
      `/teachers/activate/${token}`,
      getAppBaseUrl(),
    ).toString(),
    expiresAt:
      invitation.expiresAt instanceof Date
        ? invitation.expiresAt.toISOString()
        : new Date(String(invitation.expiresAt)).toISOString(),
    createdAt: serializeDate(invitation.createdAt),
  } satisfies SerializedTeacherInvitation;
}

async function getCollegeNameMap(universityId: string) {
  const colleges = await CollegeModel.find({ universityId })
    .select({ name: 1 })
    .lean();

  return new Map(
    colleges.map((college) => [String(college._id), String(college.name)]),
  );
}

async function getDepartmentNameMap(universityId: string) {
  const departments = await DepartmentModel.find({ universityId })
    .select({ name: 1 })
    .lean();

  return new Map(
    departments.map((department) => [
      String(department._id),
      String(department.name),
    ]),
  );
}

export async function getCampusAdminDashboard() {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;

  const [collegesCount, departmentsCount, representativesCount, teachersCount] =
    await Promise.all([
      CollegeModel.countDocuments({ universityId }),
      DepartmentModel.countDocuments({ universityId }),
      RepresentativeInvitationModel.countDocuments({ universityId }),
      TeacherInvitationModel.countDocuments({ universityId }),
    ]);

  return {
    stats: {
      collegesCount,
      departmentsCount,
      representativesCount,
      teachersCount,
      studentsCount: 0,
    },
    checklist: [
      {
        label: "Create First College",
        complete: collegesCount > 0,
        href: "/campus-admin/colleges",
      },
      {
        label: "Create First Department",
        complete: departmentsCount > 0,
        href: "/campus-admin/departments",
      },
      {
        label: "Create First Representative",
        complete: representativesCount > 0,
        href: "/campus-admin/representatives",
      },
      {
        label: "Create First Teacher",
        complete: teachersCount > 0,
        href: "/campus-admin/teachers",
      },
    ],
    hasColleges: collegesCount > 0,
  };
}

export async function getColleges() {
  const session = await requireCampusAdminSession();
  await connectMongo();

  const colleges = await CollegeModel.find(
    withUniversityFilter(String(session.user.universityId)),
  )
    .sort({ createdAt: -1 })
    .lean();

  return colleges.map((college) =>
    serializeCollege(college as Record<string, unknown>),
  );
}

export async function createCollege(input: CollegeInput) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = collegeInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const slug = slugify(payload.name);
  const code = resolveCollegeCode(payload);
  const existing = await CollegeModel.findOne({
    universityId,
    ...deletedFilter,
    $or: [{ slug }, { code }],
  }).lean();

  if (existing) {
    throw new ApiError({
      statusCode: 409,
      code: "COLLEGE_ALREADY_EXISTS",
      message: "A college with this name or code already exists.",
    });
  }

  const college = await CollegeModel.create({
    _id: randomUUID(),
    universityId,
    name: payload.name,
    slug,
    code,
    shortName: payload.shortName,
    description: payload.description,
    logo: payload.logo || null,
    status: payload.status,
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "COLLEGE_CREATE",
    entityType: "college",
    entityId: String(college._id),
    after: serializeCollege(college.toObject()),
  });

  return serializeCollege(college.toObject());
}

export async function updateCollege(collegeId: string, input: CollegeInput) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = collegeInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const slug = slugify(payload.name);
  const code = resolveCollegeCode(payload);
  const duplicate = await CollegeModel.findOne({
    _id: { $ne: collegeId },
    universityId,
    ...deletedFilter,
    $or: [{ slug }, { code }],
  }).lean();

  if (duplicate) {
    throw new ApiError({
      statusCode: 409,
      code: "COLLEGE_ALREADY_EXISTS",
      message: "A college with this name or code already exists.",
    });
  }

  const before = await CollegeModel.findOne({
    _id: collegeId,
    universityId,
    ...deletedFilter,
  });

  const college = await CollegeModel.findOneAndUpdate(
    { _id: collegeId, universityId, ...deletedFilter },
    {
      $set: {
        name: payload.name,
        slug,
        code,
        shortName: payload.shortName,
        description: payload.description,
        logo: payload.logo || null,
        status: payload.status,
      },
    },
    { new: true },
  ).lean();

  if (!college) {
    throw new ApiError({
      statusCode: 404,
      code: "COLLEGE_NOT_FOUND",
      message: "College not found.",
    });
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "COLLEGE_UPDATE",
    entityType: "college",
    entityId: collegeId,
    before: before ? serializeCollege(before.toObject()) : null,
    after: serializeCollege(college as Record<string, unknown>),
  });

  return serializeCollege(college as Record<string, unknown>);
}

export async function deactivateCollege(collegeId: string) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const before = await CollegeModel.findOne({
    _id: collegeId,
    universityId,
    ...deletedFilter,
  }).lean();

  const college = await CollegeModel.findOneAndUpdate(
    { _id: collegeId, universityId, ...deletedFilter },
    { $set: { status: "INACTIVE" } },
    { new: true },
  ).lean();

  if (!college) {
    throw new ApiError({
      statusCode: 404,
      code: "COLLEGE_NOT_FOUND",
      message: "College not found.",
    });
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "COLLEGE_UPDATE",
    entityType: "college",
    entityId: collegeId,
    before: before ? serializeCollege(before as Record<string, unknown>) : null,
    after: serializeCollege(college as Record<string, unknown>),
  });

  return serializeCollege(college as Record<string, unknown>);
}

export async function getDepartments() {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const [departments, collegeNames] = await Promise.all([
    DepartmentModel.find({ universityId }).sort({ createdAt: -1 }).lean(),
    getCollegeNameMap(universityId),
  ]);

  return departments.map((department) =>
    serializeDepartment(
      department as Record<string, unknown>,
      collegeNames.get(String(department.collegeId)) ?? "Unknown college",
    ),
  );
}

export async function createDepartment(input: DepartmentInput) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = departmentInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const code = normalizeCode(payload.code);
  const college = await CollegeModel.findOne({
    _id: payload.collegeId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!college) {
    throw new Error("Selected college does not exist.");
  }

  const existing = await DepartmentModel.findOne({
    universityId,
    ...deletedFilter,
    code,
  }).lean();

  if (existing) {
    throw new ApiError({
      statusCode: 409,
      code: "DEPARTMENT_ALREADY_EXISTS",
      message: "A department with this code already exists.",
    });
  }

  const department = await DepartmentModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: payload.collegeId,
    name: payload.name,
    code,
    slug: slugify(payload.name),
    description: payload.description,
    status: payload.status,
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "DEPARTMENT_CREATE",
    entityType: "department",
    entityId: String(department._id),
    after: serializeDepartment(department.toObject(), String(college.name)),
  });

  return serializeDepartment(department.toObject(), String(college.name));
}

export async function updateDepartment(
  departmentId: string,
  input: DepartmentInput,
) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = departmentInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const code = normalizeCode(payload.code);
  const college = await CollegeModel.findOne({
    _id: payload.collegeId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!college) {
    throw new Error("Selected college does not exist.");
  }

  const duplicate = await DepartmentModel.findOne({
    _id: { $ne: departmentId },
    universityId,
    ...deletedFilter,
    code,
  }).lean();

  if (duplicate) {
    throw new ApiError({
      statusCode: 409,
      code: "DEPARTMENT_ALREADY_EXISTS",
      message: "A department with this code already exists.",
    });
  }

  const before = await DepartmentModel.findOne({
    _id: departmentId,
    universityId,
    ...deletedFilter,
  }).lean();

  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, universityId, ...deletedFilter },
    {
      $set: {
        collegeId: payload.collegeId,
        name: payload.name,
        code,
        slug: slugify(payload.name),
        description: payload.description,
        status: payload.status,
      },
    },
    { new: true },
  ).lean();

  if (!department) {
    throw new ApiError({
      statusCode: 404,
      code: "DEPARTMENT_NOT_FOUND",
      message: "Department not found.",
    });
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "DEPARTMENT_UPDATE",
    entityType: "department",
    entityId: departmentId,
    before: before
      ? serializeDepartment(
          before as Record<string, unknown>,
          String(college.name),
        )
      : null,
    after: serializeDepartment(
      department as Record<string, unknown>,
      String(college.name),
    ),
  });

  return serializeDepartment(
    department as Record<string, unknown>,
    String(college.name),
  );
}

export async function deactivateDepartment(departmentId: string) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const before = await DepartmentModel.findOne({
    _id: departmentId,
    universityId,
    ...deletedFilter,
  }).lean();
  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, universityId, ...deletedFilter },
    { $set: { status: "INACTIVE" } },
    { new: true },
  ).lean();

  if (!department) {
    throw new ApiError({
      statusCode: 404,
      code: "DEPARTMENT_NOT_FOUND",
      message: "Department not found.",
    });
  }

  const college = await CollegeModel.findById(department.collegeId).lean();

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "DEPARTMENT_UPDATE",
    entityType: "department",
    entityId: departmentId,
    before: before
      ? serializeDepartment(
          before as Record<string, unknown>,
          college ? String(college.name) : "Unknown college",
        )
      : null,
    after: serializeDepartment(
      department as Record<string, unknown>,
      college ? String(college.name) : "Unknown college",
    ),
  });

  return serializeDepartment(
    department as Record<string, unknown>,
    college ? String(college.name) : "Unknown college",
  );
}

export async function getRepresentativeInvitations() {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const [invitations, collegeNames] = await Promise.all([
    RepresentativeInvitationModel.find({ universityId })
      .sort({ createdAt: -1 })
      .lean(),
    getCollegeNameMap(universityId),
  ]);

  return invitations.map((invitation) =>
    serializeRepresentativeInvitation(
      invitation as Record<string, unknown>,
      collegeNames.get(String(invitation.collegeId)) ?? "Unknown college",
    ),
  );
}

export async function createRepresentativeInvitation(
  input: RepresentativeInvitationInput,
) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = representativeInvitationInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const college = await CollegeModel.findOne({
    _id: payload.collegeId,
    universityId,
  }).lean();

  if (!college) {
    throw new Error("Selected college does not exist.");
  }

  const invitationToken = createToken();
  const invitation = await RepresentativeInvitationModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: payload.collegeId,
    status: "SENT",
    invitationToken,
    expiresAt: new Date(Date.now() + payload.expiresInDays * invitationTtlMs),
    invitedByUserId: session.user.id,
    sentAt: new Date(),
  });
  await InvitationModel.create({
    _id: randomUUID(),
    token: invitationToken,
    type: "REPRESENTATIVE_INVITATION",
    email: null,
    universityId,
    collegeId: payload.collegeId,
    departmentId: null,
    role: "STUDENT",
    position: "REPRESENTATIVE",
    createdBy: session.user.id,
    expiresAt: invitation.expiresAt,
    status: "PENDING",
    metadata: {
      legacyInvitationId: invitation._id,
    },
  });
  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: String(invitation._id),
    after: invitation.toObject(),
  });
  await emitNotificationEvent({
    type: "INVITATION_CREATED",
    universityId,
    actorId: session.user.id,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return serializeRepresentativeInvitation(
    invitation.toObject(),
    String(college.name),
  );
}

export async function updateRepresentativeInvitation(
  invitationId: string,
  input: RepresentativeInvitationInput,
) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = representativeInvitationInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const college = await CollegeModel.findOne({
    _id: payload.collegeId,
    universityId,
  }).lean();

  if (!college) {
    throw new Error("Selected college does not exist.");
  }

  const invitation = await RepresentativeInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId },
    {
      $set: {
        collegeId: payload.collegeId,
        expiresAt: new Date(
          Date.now() + payload.expiresInDays * invitationTtlMs,
        ),
      },
    },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Representative invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      type: "REPRESENTATIVE_INVITATION",
      "metadata.legacyInvitationId": invitation._id,
    },
    {
      $set: {
        collegeId: payload.collegeId,
        expiresAt: invitation.expiresAt,
      },
    },
  );

  return serializeRepresentativeInvitation(
    invitation as Record<string, unknown>,
    String(college.name),
  );
}

export async function resendRepresentativeInvitation(invitationId: string) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const invitation = await RepresentativeInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId: session.user.universityId },
    {
      $set: {
        status: "SENT",
        invitationToken: createToken(),
        expiresAt: new Date(Date.now() + 14 * invitationTtlMs),
        sentAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Representative invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      type: "REPRESENTATIVE_INVITATION",
      "metadata.legacyInvitationId": invitation._id,
    },
    {
      $set: {
        token: invitation.invitationToken,
        expiresAt: invitation.expiresAt,
        status: "PENDING",
        revokedAt: null,
        revokedBy: null,
      },
    },
  );

  const college = await CollegeModel.findById(invitation.collegeId).lean();

  return serializeRepresentativeInvitation(
    invitation as Record<string, unknown>,
    college ? String(college.name) : "Unknown college",
  );
}

export async function deactivateRepresentativeInvitation(invitationId: string) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const invitation = await RepresentativeInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId },
    { $set: { status: "DISABLED" } },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Representative invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      token: invitation.invitationToken,
      type: "REPRESENTATIVE_INVITATION",
      universityId,
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
    universityId,
    action: "INVITATION_REVOKED",
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  const college = await CollegeModel.findById(invitation.collegeId).lean();

  return serializeRepresentativeInvitation(
    invitation as Record<string, unknown>,
    college ? String(college.name) : "Unknown college",
  );
}

export async function getTeacherInvitations() {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const [invitations, departmentNames] = await Promise.all([
    TeacherInvitationModel.find({ universityId })
      .sort({ createdAt: -1 })
      .lean(),
    getDepartmentNameMap(universityId),
  ]);

  return invitations.map((invitation) =>
    serializeTeacherInvitation(
      invitation as Record<string, unknown>,
      departmentNames.get(String(invitation.departmentId)) ??
        "Unknown department",
    ),
  );
}

export async function createTeacherInvitation(input: TeacherInvitationInput) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = teacherInvitationInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const department = await DepartmentModel.findOne({
    _id: payload.departmentId,
    universityId,
  }).lean();

  if (!department) {
    throw new Error("Selected department does not exist.");
  }

  const invitationToken = createToken();
  const invitation = await TeacherInvitationModel.create({
    _id: randomUUID(),
    universityId,
    departmentId: payload.departmentId,
    status: "SENT",
    invitationToken,
    expiresAt: new Date(Date.now() + payload.expiresInDays * invitationTtlMs),
    invitedByUserId: session.user.id,
    sentAt: new Date(),
  });
  await InvitationModel.create({
    _id: randomUUID(),
    token: invitationToken,
    type: "TEACHER_INVITATION",
    email: null,
    universityId,
    collegeId: department.collegeId ?? null,
    departmentId: payload.departmentId,
    role: "TEACHER",
    position: "NONE",
    createdBy: session.user.id,
    expiresAt: invitation.expiresAt,
    status: "PENDING",
    metadata: {
      legacyInvitationId: invitation._id,
    },
  });

  return serializeTeacherInvitation(
    invitation.toObject(),
    String(department.name),
  );
}

export async function updateTeacherInvitation(
  invitationId: string,
  input: TeacherInvitationInput,
) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const payload = teacherInvitationInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const department = await DepartmentModel.findOne({
    _id: payload.departmentId,
    universityId,
  }).lean();

  if (!department) {
    throw new Error("Selected department does not exist.");
  }

  const invitation = await TeacherInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId },
    {
      $set: {
        departmentId: payload.departmentId,
        expiresAt: new Date(
          Date.now() + payload.expiresInDays * invitationTtlMs,
        ),
      },
    },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Teacher invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      type: "TEACHER_INVITATION",
      "metadata.legacyInvitationId": invitation._id,
    },
    {
      $set: {
        collegeId: department.collegeId ?? null,
        departmentId: payload.departmentId,
        expiresAt: invitation.expiresAt,
      },
    },
  );

  return serializeTeacherInvitation(
    invitation as Record<string, unknown>,
    String(department.name),
  );
}

export async function resendTeacherInvitation(invitationId: string) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const invitation = await TeacherInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId: session.user.universityId },
    {
      $set: {
        status: "SENT",
        invitationToken: createToken(),
        expiresAt: new Date(Date.now() + 14 * invitationTtlMs),
        sentAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Teacher invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      type: "TEACHER_INVITATION",
      "metadata.legacyInvitationId": invitation._id,
    },
    {
      $set: {
        token: invitation.invitationToken,
        expiresAt: invitation.expiresAt,
        status: "PENDING",
        revokedAt: null,
        revokedBy: null,
      },
    },
  );

  const department = await DepartmentModel.findById(
    invitation.departmentId,
  ).lean();

  return serializeTeacherInvitation(
    invitation as Record<string, unknown>,
    department ? String(department.name) : "Unknown department",
  );
}

export async function deactivateTeacherInvitation(invitationId: string) {
  const session = await requireCampusAdminSession();
  await connectMongo();
  const universityId = session.user.universityId as string;
  const invitation = await TeacherInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId },
    { $set: { status: "DISABLED" } },
    { new: true },
  ).lean();

  if (!invitation) {
    throw new Error("Teacher invitation not found.");
  }

  await InvitationModel.updateOne(
    {
      token: invitation.invitationToken,
      type: "TEACHER_INVITATION",
      universityId,
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

  const department = await DepartmentModel.findById(
    invitation.departmentId,
  ).lean();

  return serializeTeacherInvitation(
    invitation as Record<string, unknown>,
    department ? String(department.name) : "Unknown department",
  );
}
