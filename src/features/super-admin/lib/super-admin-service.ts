import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import type { RoleKey } from "@/features/authorization/roles";
import type {
  CampusAdminActivationInput,
  CampusAdminInvitationInput,
  SuperAdminCollegeInput,
  SuperAdminDepartmentInput,
  UniversityInput,
} from "@/features/super-admin/lib/schemas";
import {
  campusAdminActivationSchema,
  campusAdminInvitationInputSchema,
  superAdminCollegeInputSchema,
  superAdminDepartmentInputSchema,
  universityInputSchema,
} from "@/features/super-admin/lib/schemas";
import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AuditLogModel,
  AnnouncementModel,
  ApplicationModel,
  CommitteeModel,
  CommitteeMemberModel,
  CommunityModel,
  CommunityMemberModel,
  CampusAdminInvitationModel,
  CollegeModel,
  DepartmentModel,
  EventModel,
  EmployerApplicationModel,
  InvitationModel,
  LeadershipReportModel,
  OrderRequestModel,
  ProductModel,
  ProjectModel,
  ReportModel,
  SessionModel,
  ShopModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import { forbidden, notFound, unauthorized } from "@/lib/api/response";
import { ApiError } from "@/lib/errors/api-error";
import type { AuthSession } from "@/types/auth";

const campusAdminInvitationTtlMs = 1000 * 60 * 60 * 24;

export type SerializedUniversity = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  country: string | null;
  region: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  locationName: string | null;
  locationAddress: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationSource: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedUniversityProfile = {
  university: SerializedUniversity;
  stats: {
    colleges: number;
    departments: number;
    campusAdmins: number;
    students: number;
    events: number;
    communities: number;
    projects: number;
    marketplace: number;
    governance: number;
    reports: number;
    analytics: number;
    users: number;
    invitations: number;
    auditEvents: number;
  };
};

export type SerializedSuperAdminCollege = {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  shortName: string | null;
  code: string;
  slug: string;
  description: string | null;
  logo: string | null;
  status: "ACTIVE" | "INACTIVE";
  departmentsCount: number;
  usersCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedSuperAdminDepartment = {
  id: string;
  universityId: string;
  universityName: string;
  collegeId: string;
  collegeName: string;
  name: string;
  code: string;
  slug: string | null;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  usersCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedSuperAdminCommitteeCommunity = {
  id: string;
  universityId: string;
  universityName: string;
  name: string;
  description: string | null;
  visibility: string;
  status: string;
  ownerName: string;
  communityMembers: number;
  moderators: number;
  committees: number;
  committeeMembers: number;
  createdAt: string | null;
};

export type SerializedSuperAdminCommitteeMember = {
  id: string;
  committeeId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string | null;
};

export type SerializedSuperAdminCommittee = {
  id: string;
  universityId: string;
  name: string;
  description: string | null;
  scopeType: string;
  category: string;
  status: string;
  memberCount: number;
  members: SerializedSuperAdminCommitteeMember[];
  createdAt: string | null;
};

export type SerializedSuperAdminCommitteeCommunityDetail = {
  community: SerializedSuperAdminCommitteeCommunity;
  committees: SerializedSuperAdminCommittee[];
};

export type SerializedCampusAdminInvitation = {
  id: string;
  universityId: string;
  universityName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  expiresAt: string;
  status: "PENDING" | "SENT" | "ACCEPTED" | "EXPIRED" | "DISABLED";
  invitationUrl: string;
  createdAt: string | null;
};

export type SerializedSuperAdminUser = {
  id: string;
  photo: string;
  name: string;
  email: string;
  role: string;
  position: string;
  university: string;
  college: string;
  department: string;
  status: "Active" | "Suspended" | "Pending";
  lastActive: string;
  phone: string;
  country: string;
};

export type SerializedSuperAdminAuditLog = {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  university: string;
  action: string;
  category: string;
  entity: string;
  ipAddress: string;
  status: "Success" | "Warning" | "Failed";
  metadata: string;
};

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function assignedName(
  names: Map<string, string>,
  value: unknown,
  fallback = "Not assigned",
) {
  const id = String(value ?? "");

  if (!id) {
    return fallback;
  }

  return names.get(id) ?? fallback;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function resolveCollegeCode(input: Pick<SuperAdminCollegeInput, "code" | "shortName" | "name">) {
  return normalizeCode(input.code || input.shortName || input.name);
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function serializeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDateTime(value: unknown) {
  return value instanceof Date ? value.toLocaleString() : "Not recorded";
}

function getDisplayName(user: Record<string, unknown>) {
  return (
    String(user.name ?? "") ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    String(user.email ?? "Unknown user")
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getRoles(session: AuthSession) {
  return session.user.roles?.length
    ? session.user.roles
    : ([session.user.role].filter(Boolean) as RoleKey[]);
}

export async function requireSuperAdminSession() {
  const session = (await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })) as AuthSession | null;

  if (!session) {
    throw unauthorized();
  }

  if (!getRoles(session).includes("SUPER_ADMIN")) {
    throw forbidden("Super Admin access is required.");
  }

  return session;
}

function serializeUniversity(university: Record<string, unknown>) {
  return {
    id: String(university._id),
    name: String(university.name),
    shortName: (university.shortName as string | null) ?? null,
    slug: String(university.slug),
    description: (university.description as string | null) ?? null,
    logo:
      (university.logo as string | null) ??
      (university.logoUrl as string | null) ??
      null,
    coverImage: (university.coverImage as string | null) ?? null,
    country: (university.country as string | null) ?? null,
    region: (university.region as string | null) ?? null,
    website: (university.website as string | null) ?? null,
    email: (university.email as string | null) ?? null,
    phone: (university.phone as string | null) ?? null,
    locationName: (university.locationName as string | null) ?? null,
    locationAddress: (university.locationAddress as string | null) ?? null,
    locationLatitude:
      typeof university.locationLatitude === "number"
        ? university.locationLatitude
        : null,
    locationLongitude:
      typeof university.locationLongitude === "number"
        ? university.locationLongitude
        : null,
    locationSource: (university.locationSource as string | null) ?? null,
    status: (university.status as SerializedUniversity["status"]) ?? "ACTIVE",
    createdAt: serializeDate(university.createdAt),
    updatedAt: serializeDate(university.updatedAt),
  } satisfies SerializedUniversity;
}

function serializeSuperAdminCollege(
  college: Record<string, unknown>,
  universityName: string,
  departmentsCount: number,
  usersCount: number,
) {
  return {
    id: String(college._id),
    universityId: String(college.universityId),
    universityName,
    name: String(college.name),
    shortName: serializeOptionalString(college.shortName),
    code: String(college.code),
    slug: String(college.slug),
    description: serializeOptionalString(college.description),
    logo: serializeOptionalString(college.logo),
    status: (college.status as SerializedSuperAdminCollege["status"]) ?? "ACTIVE",
    departmentsCount,
    usersCount,
    createdAt: serializeDate(college.createdAt),
    updatedAt: serializeDate(college.updatedAt),
  } satisfies SerializedSuperAdminCollege;
}

function serializeSuperAdminDepartment(
  department: Record<string, unknown>,
  universityName: string,
  collegeName: string,
  usersCount: number,
) {
  return {
    id: String(department._id),
    universityId: String(department.universityId),
    universityName,
    collegeId: String(department.collegeId),
    collegeName,
    name: String(department.name),
    code: String(department.code),
    slug: serializeOptionalString(department.slug),
    description: serializeOptionalString(department.description),
    status:
      (department.status as SerializedSuperAdminDepartment["status"]) ??
      "ACTIVE",
    usersCount,
    createdAt: serializeDate(department.createdAt),
    updatedAt: serializeDate(department.updatedAt),
  } satisfies SerializedSuperAdminDepartment;
}

function serializeInvitation(
  invitation: Record<string, unknown>,
  universityName: string,
) {
  const token = String(invitation.token);

  return {
    id: String(invitation._id),
    universityId: String(invitation.universityId),
    universityName,
    firstName: serializeOptionalString(invitation.firstName),
    lastName: serializeOptionalString(invitation.lastName),
    email: serializeOptionalString(invitation.email),
    phone: serializeOptionalString(invitation.phone),
    expiresAt:
      invitation.expiresAt instanceof Date
        ? invitation.expiresAt.toISOString()
        : new Date(String(invitation.expiresAt)).toISOString(),
    status:
      (invitation.status as SerializedCampusAdminInvitation["status"]) ??
      "PENDING",
    invitationUrl: new URL(
      `/campus-admin/activate/${token}`,
      getAppBaseUrl(),
    ).toString(),
    createdAt: serializeDate(invitation.createdAt),
  } satisfies SerializedCampusAdminInvitation;
}

export async function getSuperAdminDashboard() {
  await requireSuperAdminSession();
  await connectMongo();

  const [
    universitiesCount,
    campusAdminCount,
    studentsCount,
    employersCount,
    pendingEmployerApplicationsCount,
  ] = await Promise.all([
    UniversityModel.countDocuments(),
    UserModel.countDocuments({ roles: "CAMPUS_ADMIN" }),
    UserModel.countDocuments({ roles: "STUDENT" }),
    UserModel.countDocuments({ roles: "EMPLOYER" }),
    EmployerApplicationModel.countDocuments({ status: "PENDING" }),
  ]);

  return {
    stats: {
      universitiesCount,
      campusAdminCount,
      studentsCount,
      employersCount,
      pendingEmployerApplicationsCount,
    },
    checklist: [
      {
        label: "Create First University",
        complete: universitiesCount > 0,
        href: "/super-admin/universities",
      },
      {
        label: "Create First Campus Admin",
        complete: campusAdminCount > 0,
        href: "/super-admin/campus-admins",
      },
      {
        label: "Configure Platform Settings",
        complete: false,
        href: "/super-admin/settings",
      },
      {
        label: "Review Employer Applications",
        complete: pendingEmployerApplicationsCount === 0,
        href: "/super-admin/employer-applications",
      },
    ],
    hasUniversities: universitiesCount > 0,
  };
}

export async function getUniversities() {
  await requireSuperAdminSession();
  await connectMongo();

  const universities = await UniversityModel.find()
    .sort({ createdAt: -1 })
    .lean();

  return universities.map((university) =>
    serializeUniversity(university as Record<string, unknown>),
  );
}

export async function listSuperAdminColleges() {
  await requireSuperAdminSession();
  await connectMongo();

  const colleges = await CollegeModel.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  const collegeIds = colleges.map((college) => String(college._id));
  const universityIds = Array.from(
    new Set(
      colleges
        .map((college) => String(college.universityId ?? ""))
        .filter(Boolean),
    ),
  );

  const [universities, departmentCounts, userCounts] = await Promise.all([
    UniversityModel.find({ _id: { $in: universityIds } })
      .select({ name: 1 })
      .lean(),
    DepartmentModel.aggregate<{ _id: string; count: number }>([
      { $match: { collegeId: { $in: collegeIds }, deletedAt: null } },
      { $group: { _id: "$collegeId", count: { $sum: 1 } } },
    ]),
    UserModel.aggregate<{ _id: string; count: number }>([
      { $match: { collegeId: { $in: collegeIds }, deletedAt: null } },
      { $group: { _id: "$collegeId", count: { $sum: 1 } } },
    ]),
  ]);

  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );
  const departmentsByCollege = new Map(
    departmentCounts.map((item) => [String(item._id), item.count]),
  );
  const usersByCollege = new Map(
    userCounts.map((item) => [String(item._id), item.count]),
  );

  return colleges.map((college) => {
    const collegeId = String(college._id);
    const universityId = String(college.universityId);

    return serializeSuperAdminCollege(
      college as Record<string, unknown>,
      universityNames.get(universityId) ?? "Unknown university",
      departmentsByCollege.get(collegeId) ?? 0,
      usersByCollege.get(collegeId) ?? 0,
    );
  });
}

export async function createSuperAdminCollege(input: SuperAdminCollegeInput) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const payload = superAdminCollegeInputSchema.parse(input);
  const university = await UniversityModel.findOne({
    _id: payload.universityId,
    deletedAt: null,
  }).lean();

  if (!university) {
    throw notFound("University not found.");
  }

  const slug = slugify(payload.name);
  const code = resolveCollegeCode(payload);
  const existing = await CollegeModel.findOne({
    universityId: payload.universityId,
    deletedAt: null,
    $or: [{ slug }, { code }, { name: payload.name }],
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
    universityId: payload.universityId,
    name: payload.name,
    slug,
    code,
    shortName: payload.shortName,
    description: payload.description,
    logo: payload.logo || null,
    status: payload.status,
    createdById: session.user.id,
    updatedById: session.user.id,
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId: payload.universityId,
    action: "COLLEGE_CREATE",
    entityType: "college",
    entityId: String(college._id),
    after: college.toObject(),
  });

  return serializeSuperAdminCollege(
    college.toObject(),
    String(university.name),
    0,
    0,
  );
}

export async function updateSuperAdminCollege(
  collegeId: string,
  input: SuperAdminCollegeInput,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const payload = superAdminCollegeInputSchema.parse(input);
  const university = await UniversityModel.findOne({
    _id: payload.universityId,
    deletedAt: null,
  }).lean();

  if (!university) {
    throw notFound("University not found.");
  }

  const before = await CollegeModel.findOne({
    _id: collegeId,
    deletedAt: null,
  }).lean();

  if (!before) {
    throw notFound("College not found.");
  }

  const slug = slugify(payload.name);
  const code = resolveCollegeCode(payload);
  const duplicate = await CollegeModel.findOne({
    _id: { $ne: collegeId },
    universityId: payload.universityId,
    deletedAt: null,
    $or: [{ slug }, { code }, { name: payload.name }],
  }).lean();

  if (duplicate) {
    throw new ApiError({
      statusCode: 409,
      code: "COLLEGE_ALREADY_EXISTS",
      message: "A college with this name or code already exists.",
    });
  }

  const college = await CollegeModel.findOneAndUpdate(
    { _id: collegeId, deletedAt: null },
    {
      $set: {
        universityId: payload.universityId,
        name: payload.name,
        slug,
        code,
        shortName: payload.shortName,
        description: payload.description,
        logo: payload.logo || null,
        status: payload.status,
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  if (!college) {
    throw notFound("College not found.");
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId: payload.universityId,
    action: "COLLEGE_UPDATE",
    entityType: "college",
    entityId: collegeId,
    before,
    after: college,
  });

  const [departmentsCount, usersCount] = await Promise.all([
    DepartmentModel.countDocuments({ collegeId, deletedAt: null }),
    UserModel.countDocuments({ collegeId, deletedAt: null }),
  ]);

  return serializeSuperAdminCollege(
    college as Record<string, unknown>,
    String(university.name),
    departmentsCount,
    usersCount,
  );
}

export async function deactivateSuperAdminCollege(collegeId: string) {
  const college = await updateSuperAdminCollegeStatus(collegeId, "INACTIVE");
  return college;
}

export async function deleteSuperAdminCollege(collegeId: string) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const before = await CollegeModel.findOne({
    _id: collegeId,
    deletedAt: null,
  }).lean();

  if (!before) {
    throw notFound("College not found.");
  }

  const college = await CollegeModel.findOneAndUpdate(
    { _id: collegeId, deletedAt: null },
    {
      $set: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: session.user.id,
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(before.universityId),
    action: "COLLEGE_DELETE",
    entityType: "college",
    entityId: collegeId,
    before,
    after: college,
  });

  return { id: collegeId };
}

async function updateSuperAdminCollegeStatus(
  collegeId: string,
  status: SerializedSuperAdminCollege["status"],
) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const before = await CollegeModel.findOne({
    _id: collegeId,
    deletedAt: null,
  }).lean();

  if (!before) {
    throw notFound("College not found.");
  }

  const college = await CollegeModel.findOneAndUpdate(
    { _id: collegeId, deletedAt: null },
    {
      $set: {
        status,
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  if (!college) {
    throw notFound("College not found.");
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(before.universityId),
    action: "COLLEGE_UPDATE",
    entityType: "college",
    entityId: collegeId,
    before,
    after: college,
  });

  const [university, departmentsCount, usersCount] = await Promise.all([
    UniversityModel.findById(String(college.universityId)).select({ name: 1 }).lean(),
    DepartmentModel.countDocuments({ collegeId, deletedAt: null }),
    UserModel.countDocuments({ collegeId, deletedAt: null }),
  ]);

  return serializeSuperAdminCollege(
    college as Record<string, unknown>,
    university ? String(university.name) : "Unknown university",
    departmentsCount,
    usersCount,
  );
}

export async function listSuperAdminDepartments() {
  await requireSuperAdminSession();
  await connectMongo();

  const departments = await DepartmentModel.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  const departmentIds = departments.map((department) => String(department._id));
  const universityIds = Array.from(
    new Set(
      departments
        .map((department) => String(department.universityId ?? ""))
        .filter(Boolean),
    ),
  );
  const collegeIds = Array.from(
    new Set(
      departments
        .map((department) => String(department.collegeId ?? ""))
        .filter(Boolean),
    ),
  );

  const [universities, colleges, userCounts] = await Promise.all([
    UniversityModel.find({ _id: { $in: universityIds } })
      .select({ name: 1 })
      .lean(),
    CollegeModel.find({ _id: { $in: collegeIds } })
      .select({ name: 1 })
      .lean(),
    UserModel.aggregate<{ _id: string; count: number }>([
      { $match: { departmentId: { $in: departmentIds }, deletedAt: null } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
  ]);

  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );
  const collegeNames = new Map(
    colleges.map((college) => [String(college._id), String(college.name)]),
  );
  const usersByDepartment = new Map(
    userCounts.map((item) => [String(item._id), item.count]),
  );

  return departments.map((department) => {
    const record = department as Record<string, unknown>;
    const departmentId = String(department._id);
    const universityId = String(department.universityId);
    const collegeId = String(department.collegeId);

    return serializeSuperAdminDepartment(
      record,
      universityNames.get(universityId) ?? "Unknown university",
      collegeNames.get(collegeId) ?? "Unknown college",
      usersByDepartment.get(departmentId) ?? 0,
    );
  });
}

export async function createSuperAdminDepartment(
  input: SuperAdminDepartmentInput,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const payload = superAdminDepartmentInputSchema.parse(input);
  const [university, college] = await Promise.all([
    UniversityModel.findOne({ _id: payload.universityId, deletedAt: null }).lean(),
    CollegeModel.findOne({
      _id: payload.collegeId,
      universityId: payload.universityId,
      deletedAt: null,
    }).lean(),
  ]);

  if (!university) {
    throw notFound("University not found.");
  }

  if (!college) {
    throw notFound("College not found in the selected university.");
  }

  const code = normalizeCode(payload.code);
  const slug = slugify(payload.name);
  const duplicateName = await DepartmentModel.findOne({
    universityId: payload.universityId,
    collegeId: payload.collegeId,
    deletedAt: null,
    $or: [{ slug }, { name: payload.name }],
  }).lean();

  if (duplicateName) {
    throw new ApiError({
      statusCode: 409,
      code: "DEPARTMENT_ALREADY_EXISTS",
      message: "A department with this name already exists in this college.",
    });
  }

  const duplicateCode = await DepartmentModel.findOne({
    universityId: payload.universityId,
    code,
    deletedAt: null,
  }).lean();

  if (duplicateCode) {
    throw new ApiError({
      statusCode: 409,
      code: "DEPARTMENT_CODE_ALREADY_EXISTS",
      message: "A department with this code already exists.",
    });
  }

  const department = await DepartmentModel.create({
    _id: randomUUID(),
    universityId: payload.universityId,
    collegeId: payload.collegeId,
    name: payload.name,
    code,
    slug,
    description: payload.description,
    status: payload.status,
    createdById: session.user.id,
    updatedById: session.user.id,
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId: payload.universityId,
    action: "DEPARTMENT_CREATE",
    entityType: "department",
    entityId: String(department._id),
    after: department.toObject(),
  });

  return serializeSuperAdminDepartment(
    department.toObject(),
    String(university.name),
    String(college.name),
    0,
  );
}

export async function updateSuperAdminDepartment(
  departmentId: string,
  input: SuperAdminDepartmentInput,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const payload = superAdminDepartmentInputSchema.parse(input);
  const [university, college, before] = await Promise.all([
    UniversityModel.findOne({ _id: payload.universityId, deletedAt: null }).lean(),
    CollegeModel.findOne({
      _id: payload.collegeId,
      universityId: payload.universityId,
      deletedAt: null,
    }).lean(),
    DepartmentModel.findOne({ _id: departmentId, deletedAt: null }).lean(),
  ]);

  if (!university) {
    throw notFound("University not found.");
  }

  if (!college) {
    throw notFound("College not found in the selected university.");
  }

  if (!before) {
    throw notFound("Department not found.");
  }

  const code = normalizeCode(payload.code);
  const slug = slugify(payload.name);
  const duplicateName = await DepartmentModel.findOne({
    _id: { $ne: departmentId },
    universityId: payload.universityId,
    collegeId: payload.collegeId,
    deletedAt: null,
    $or: [{ slug }, { name: payload.name }],
  }).lean();

  if (duplicateName) {
    throw new ApiError({
      statusCode: 409,
      code: "DEPARTMENT_ALREADY_EXISTS",
      message: "A department with this name already exists in this college.",
    });
  }

  const duplicateCode = await DepartmentModel.findOne({
    _id: { $ne: departmentId },
    universityId: payload.universityId,
    code,
    deletedAt: null,
  }).lean();

  if (duplicateCode) {
    throw new ApiError({
      statusCode: 409,
      code: "DEPARTMENT_CODE_ALREADY_EXISTS",
      message: "A department with this code already exists.",
    });
  }

  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, deletedAt: null },
    {
      $set: {
        universityId: payload.universityId,
        collegeId: payload.collegeId,
        name: payload.name,
        code,
        slug,
        description: payload.description,
        status: payload.status,
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  if (!department) {
    throw notFound("Department not found.");
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId: payload.universityId,
    action: "DEPARTMENT_UPDATE",
    entityType: "department",
    entityId: departmentId,
    before,
    after: department,
  });

  const usersCount = await UserModel.countDocuments({
    departmentId,
    deletedAt: null,
  });

  return serializeSuperAdminDepartment(
    department as Record<string, unknown>,
    String(university.name),
    String(college.name),
    usersCount,
  );
}

export async function deactivateSuperAdminDepartment(departmentId: string) {
  return updateSuperAdminDepartmentStatus(departmentId, "INACTIVE");
}

async function updateSuperAdminDepartmentStatus(
  departmentId: string,
  status: SerializedSuperAdminDepartment["status"],
) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const before = await DepartmentModel.findOne({
    _id: departmentId,
    deletedAt: null,
  }).lean();

  if (!before) {
    throw notFound("Department not found.");
  }

  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, deletedAt: null },
    {
      $set: {
        status,
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  if (!department) {
    throw notFound("Department not found.");
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(before.universityId),
    action: "DEPARTMENT_UPDATE",
    entityType: "department",
    entityId: departmentId,
    before,
    after: department,
  });

  const [university, college, usersCount] = await Promise.all([
    UniversityModel.findById(String(department.universityId)).select({ name: 1 }).lean(),
    CollegeModel.findById(String(department.collegeId)).select({ name: 1 }).lean(),
    UserModel.countDocuments({ departmentId, deletedAt: null }),
  ]);

  return serializeSuperAdminDepartment(
    department as Record<string, unknown>,
    university ? String(university.name) : "Unknown university",
    college ? String(college.name) : "Unknown college",
    usersCount,
  );
}

export async function deleteSuperAdminDepartment(departmentId: string) {
  const session = await requireSuperAdminSession();
  await connectMongo();
  const before = await DepartmentModel.findOne({
    _id: departmentId,
    deletedAt: null,
  }).lean();

  if (!before) {
    throw notFound("Department not found.");
  }

  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, deletedAt: null },
    {
      $set: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: session.user.id,
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(before.universityId),
    action: "DEPARTMENT_DELETE",
    entityType: "department",
    entityId: departmentId,
    before,
    after: department,
  });

  return { id: departmentId };
}

function metadataCommitteeId(record: Record<string, unknown>) {
  const metadata = record.metadata;
  if (!metadata || typeof metadata !== "object") return null;

  const committeeId = (metadata as Record<string, unknown>).committeeId;
  return typeof committeeId === "string" && committeeId.trim()
    ? committeeId
    : null;
}

function serializeSuperAdminCommitteeCommunity(
  community: Record<string, unknown>,
  universityName: string,
  ownerName: string,
  committees: number,
  committeeMembers: number,
): SerializedSuperAdminCommitteeCommunity {
  return {
    id: String(community._id),
    universityId: String(community.universityId),
    universityName,
    name: String(community.name),
    description: serializeOptionalString(community.description),
    visibility: String(community.visibility ?? "UNIVERSITY"),
    status: String(community.status ?? "ACTIVE"),
    ownerName,
    communityMembers: Number(community.memberCount ?? 0),
    moderators: Number(community.moderatorCount ?? 0),
    committees,
    committeeMembers,
    createdAt: serializeDate(community.createdAt),
  };
}

function serializeSuperAdminCommitteeMember(
  member: Record<string, unknown>,
  user: Record<string, unknown> | undefined,
): SerializedSuperAdminCommitteeMember {
  return {
    id: String(member._id),
    committeeId: String(member.committeeId),
    userId: String(member.userId),
    name: user ? getDisplayName(user) : String(member.userId),
    email: user ? String(user.email ?? "Not available") : "Not available",
    role: String(member.role ?? "MEMBER"),
    status: String(member.status ?? "ACTIVE"),
    joinedAt: serializeDate(member.joinedAt),
  };
}

function serializeSuperAdminCommittee(
  committee: Record<string, unknown>,
  members: SerializedSuperAdminCommitteeMember[],
): SerializedSuperAdminCommittee {
  return {
    id: String(committee._id),
    universityId: String(committee.universityId),
    name: String(committee.name),
    description: serializeOptionalString(committee.description),
    scopeType: String(committee.scopeType ?? "UNIVERSITY"),
    category: String(committee.category ?? committee.committeeType ?? "GENERAL"),
    status: String(committee.status ?? "ACTIVE"),
    memberCount: Number(committee.memberCount ?? members.length),
    members,
    createdAt: serializeDate(committee.createdAt),
  };
}

export async function listSuperAdminCommitteeCommunities() {
  await requireSuperAdminSession();
  await connectMongo();

  const communities = await CommunityModel.find({ deletedAt: null })
    .sort({ universityId: 1, name: 1 })
    .lean();
  const universityIds = Array.from(
    new Set(
      communities
        .map((community) => String(community.universityId ?? ""))
        .filter(Boolean),
    ),
  );
  const ownerIds = Array.from(
    new Set(
      communities
        .map((community) => String(community.ownerId ?? ""))
        .filter(Boolean),
    ),
  );

  const [universities, owners, committeeCounts, committeeMemberCounts] =
    await Promise.all([
      UniversityModel.find({ _id: { $in: universityIds } })
        .select({ name: 1 })
        .lean(),
      UserModel.find({ _id: { $in: ownerIds } })
        .select({ name: 1, email: 1, firstName: 1, lastName: 1 })
        .lean(),
      CommitteeModel.aggregate<{ _id: string; count: number }>([
        { $match: { universityId: { $in: universityIds }, deletedAt: null } },
        { $group: { _id: "$universityId", count: { $sum: 1 } } },
      ]),
      CommitteeMemberModel.aggregate<{ _id: string; count: number }>([
        { $match: { universityId: { $in: universityIds }, status: "ACTIVE" } },
        { $group: { _id: "$universityId", count: { $sum: 1 } } },
      ]),
    ]);

  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );
  const ownerNames = new Map(
    owners.map((owner) => [
      String(owner._id),
      getDisplayName(owner as Record<string, unknown>),
    ]),
  );
  const committeesByUniversity = new Map(
    committeeCounts.map((item) => [String(item._id), item.count]),
  );
  const committeeMembersByUniversity = new Map(
    committeeMemberCounts.map((item) => [String(item._id), item.count]),
  );

  return communities.map((community) => {
    const record = community as Record<string, unknown>;
    const universityId = String(record.universityId);

    return serializeSuperAdminCommitteeCommunity(
      record,
      universityNames.get(universityId) ?? "Unknown university",
      ownerNames.get(String(record.ownerId)) ?? "Unknown owner",
      committeesByUniversity.get(universityId) ?? 0,
      committeeMembersByUniversity.get(universityId) ?? 0,
    );
  });
}

export async function getSuperAdminCommitteeCommunityDetail(
  communityId: string,
): Promise<SerializedSuperAdminCommitteeCommunityDetail> {
  await requireSuperAdminSession();
  await connectMongo();

  const community = await CommunityModel.findOne({
    _id: communityId,
    deletedAt: null,
  }).lean();

  if (!community) {
    throw notFound("Community not found.");
  }

  const communityRecord = community as Record<string, unknown>;
  const universityId = String(communityRecord.universityId);
  const linkedCommitteeId = metadataCommitteeId(communityRecord);
  const committeeFilter: Record<string, unknown> = {
    universityId,
    deletedAt: null,
  };
  if (linkedCommitteeId) {
    committeeFilter._id = linkedCommitteeId;
  }

  const [university, owner, committees, communityMembers] = await Promise.all([
    UniversityModel.findById(universityId).select({ name: 1 }).lean(),
    UserModel.findById(String(communityRecord.ownerId))
      .select({ name: 1, email: 1, firstName: 1, lastName: 1 })
      .lean(),
    CommitteeModel.find(committeeFilter).sort({ name: 1 }).lean(),
    CommunityMemberModel.countDocuments({ communityId, status: "ACTIVE" }),
  ]);
  const committeeIds = committees.map((committee) => String(committee._id));
  const members = await CommitteeMemberModel.find({
    committeeId: { $in: committeeIds },
    status: "ACTIVE",
  })
    .sort({ committeeId: 1, role: 1, joinedAt: 1 })
    .lean();
  const userIds = Array.from(
    new Set(members.map((member) => String(member.userId)).filter(Boolean)),
  );
  const users = await UserModel.find({ _id: { $in: userIds } })
    .select({ name: 1, email: 1, firstName: 1, lastName: 1 })
    .lean();
  const usersById = new Map(
    users.map((user) => [String(user._id), user as Record<string, unknown>]),
  );
  const membersByCommittee = new Map<string, SerializedSuperAdminCommitteeMember[]>();

  for (const member of members) {
    const record = member as Record<string, unknown>;
    const committeeId = String(record.committeeId);
    const committeeMembers = membersByCommittee.get(committeeId) ?? [];
    committeeMembers.push(
      serializeSuperAdminCommitteeMember(
        record,
        usersById.get(String(record.userId)),
      ),
    );
    membersByCommittee.set(committeeId, committeeMembers);
  }

  const committeeItems = committees.map((committee) => {
    const committeeId = String(committee._id);
    return serializeSuperAdminCommittee(
      committee as Record<string, unknown>,
      membersByCommittee.get(committeeId) ?? [],
    );
  });

  return {
    community: {
      ...serializeSuperAdminCommitteeCommunity(
        communityRecord,
        university ? String(university.name) : "Unknown university",
        owner ? getDisplayName(owner as Record<string, unknown>) : "Unknown owner",
        committeeItems.length,
        committeeItems.reduce((sum, committee) => sum + committee.members.length, 0),
      ),
      communityMembers,
    },
    committees: committeeItems,
  };
}

export async function removeSuperAdminCommitteeMember(
  committeeId: string,
  memberId: string,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  const committee = await CommitteeModel.findOne({
    _id: committeeId,
    deletedAt: null,
  }).lean();

  if (!committee) {
    throw notFound("Committee not found.");
  }

  const member = await CommitteeMemberModel.findOneAndUpdate(
    {
      _id: memberId,
      committeeId,
      status: "ACTIVE",
    },
    {
      $set: {
        status: "REMOVED",
        leftAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!member) {
    throw notFound("Committee member not found.");
  }

  await CommitteeModel.updateOne(
    { _id: committeeId, memberCount: { $gt: 0 } },
    { $inc: { memberCount: -1 } },
  );
  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(committee.universityId),
    action: "COMMITTEE_MEMBER_REMOVED",
    entityType: "committee_member",
    entityId: memberId,
    before: null,
    after: member,
  });

  return { id: memberId };
}

export async function getUniversityProfile(universityId: string) {
  await requireSuperAdminSession();
  await connectMongo();

  const university = await UniversityModel.findById(universityId).lean();

  if (!university) {
    throw notFound("University not found.");
  }

  const [
    colleges,
    departments,
    campusAdmins,
    students,
    events,
    communities,
    projects,
    products,
    shops,
    orderRequests,
    committees,
    leadershipReports,
    reports,
    announcements,
    applications,
    users,
    invitations,
    auditEvents,
  ] = await Promise.all([
    CollegeModel.countDocuments({ universityId, deletedAt: null }),
    DepartmentModel.countDocuments({ universityId, deletedAt: null }),
    UserModel.countDocuments({ universityId, roles: "CAMPUS_ADMIN" }),
    UserModel.countDocuments({ universityId, roles: "STUDENT" }),
    EventModel.countDocuments({ universityId, deletedAt: null }),
    CommunityModel.countDocuments({ universityId, deletedAt: null }),
    ProjectModel.countDocuments({ universityId, deletedAt: null }),
    ProductModel.countDocuments({ universityId, deletedAt: null }),
    ShopModel.countDocuments({ universityId, deletedAt: null }),
    OrderRequestModel.countDocuments({ universityId, deletedAt: null }),
    CommitteeModel.countDocuments({ universityId, deletedAt: null }),
    LeadershipReportModel.countDocuments({ universityId, deletedAt: null }),
    ReportModel.countDocuments({ universityId }),
    AnnouncementModel.countDocuments({ universityId, deletedAt: null }),
    ApplicationModel.countDocuments({ universityId, deletedAt: null }),
    UserModel.countDocuments({ universityId }),
    CampusAdminInvitationModel.countDocuments({ universityId }),
    AuditLogModel.countDocuments({ universityId }),
  ]);

  return {
    university: serializeUniversity(university as Record<string, unknown>),
    stats: {
      colleges,
      departments,
      campusAdmins,
      students,
      events,
      communities,
      projects,
      marketplace: products + shops + orderRequests,
      governance: committees + leadershipReports,
      reports,
      analytics: events + announcements + applications + auditEvents,
      users,
      invitations,
      auditEvents,
    },
  } satisfies SerializedUniversityProfile;
}

export async function listSuperAdminUsers() {
  await requireSuperAdminSession();
  await connectMongo();

  const users = await UserModel.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const universityIds = Array.from(
    new Set(users.map((user) => String(user.universityId ?? "")).filter(Boolean)),
  );
  const collegeIds = Array.from(
    new Set(users.map((user) => String(user.collegeId ?? "")).filter(Boolean)),
  );
  const departmentIds = Array.from(
    new Set(users.map((user) => String(user.departmentId ?? "")).filter(Boolean)),
  );
  const [universities, colleges, departments] = await Promise.all([
    UniversityModel.find({ _id: { $in: universityIds } })
      .select({ name: 1 })
      .lean(),
    CollegeModel.find({ _id: { $in: collegeIds } })
      .select({ name: 1 })
      .lean(),
    DepartmentModel.find({ _id: { $in: departmentIds } })
      .select({ name: 1 })
      .lean(),
  ]);
  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );
  const collegeNames = new Map(
    colleges.map((college) => [String(college._id), String(college.name)]),
  );
  const departmentNames = new Map(
    departments.map((department) => [
      String(department._id),
      String(department.name),
    ]),
  );

  return users.map((user) => {
    const record = user as Record<string, unknown>;
    const name = getDisplayName(record);
    const roles = Array.isArray(record.roles) ? record.roles.map(String) : [];
    const role = roles[0] ?? String(record.role ?? "USER");
    const status = String(record.status ?? "ACTIVE");

    return {
      id: String(record._id),
      photo: getInitials(name),
      name,
      email: String(record.email),
      role,
      position: String(record.position ?? "NONE"),
      university: assignedName(universityNames, record.universityId),
      college: assignedName(collegeNames, record.collegeId),
      department: assignedName(departmentNames, record.departmentId),
      status:
        status === "SUSPENDED"
          ? "Suspended"
          : status === "PENDING"
            ? "Pending"
            : "Active",
      lastActive: formatDateTime(record.lastLoginAt),
      phone: String(record.phoneNumber ?? record.phone ?? "Not provided"),
      country: "Not specified",
    } satisfies SerializedSuperAdminUser;
  });
}

export async function deleteSuperAdminUser(userId: string) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  if (userId === session.user.id) {
    throw forbidden("You cannot delete your own active Super Admin account.");
  }

  const before = await UserModel.findOne({
    _id: userId,
    deletedAt: null,
  }).lean();

  if (!before) {
    throw notFound("User not found.");
  }

  const user = await UserModel.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    {
      $set: {
        status: "SUSPENDED",
        deletedAt: new Date(),
        deletedById: session.user.id,
        deleteReason: "Deleted by Super Admin",
        updatedById: session.user.id,
      },
    },
    { new: true },
  ).lean();

  if (!user) {
    throw notFound("User not found.");
  }

  await SessionModel.deleteMany({ userId });
  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(user.universityId ?? before.universityId ?? "global"),
    action: "USER_DELETE",
    entityType: "user",
    entityId: userId,
    before,
    after: user,
  });

  return { id: userId };
}

export async function listSuperAdminAuditLogs() {
  await requireSuperAdminSession();
  await connectMongo();

  const logs = await AuditLogModel.find()
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  const actorIds = Array.from(
    new Set(logs.map((log) => String(log.actorId ?? "")).filter(Boolean)),
  );
  const universityIds = Array.from(
    new Set(logs.map((log) => String(log.universityId ?? "")).filter(Boolean)),
  );
  const [users, universities] = await Promise.all([
    UserModel.find({ _id: { $in: actorIds } })
      .select({ name: 1, email: 1, roles: 1, role: 1 })
      .lean(),
    UniversityModel.find({ _id: { $in: universityIds } })
      .select({ name: 1 })
      .lean(),
  ]);
  const usersById = new Map(
    users.map((user) => [String(user._id), user as Record<string, unknown>]),
  );
  const universitiesById = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );

  return logs.map((log) => {
    const record = log as Record<string, unknown>;
    const actor = usersById.get(String(record.actorId ?? ""));
    const roles =
      actor && Array.isArray(actor.roles) ? actor.roles.map(String) : [];
    const severity = String(record.severity ?? "INFO");

    return {
      id: String(record._id),
      timestamp: formatDateTime(record.createdAt),
      user: actor ? getDisplayName(actor) : "System",
      role: roles[0] ?? String(actor?.role ?? "SYSTEM"),
      university:
        universitiesById.get(String(record.universityId ?? "")) ??
        String(record.universityId ?? "Global"),
      action: String(record.action),
      category: String(record.entityType),
      entity: String(record.entityId ?? "Not set"),
      ipAddress: String(record.ipAddress ?? "Not recorded"),
      status:
        severity === "ERROR" || severity === "CRITICAL"
          ? "Failed"
          : severity === "WARNING"
            ? "Warning"
            : "Success",
      metadata: JSON.stringify(record.metadata ?? {}),
    } satisfies SerializedSuperAdminAuditLog;
  });
}

export async function createUniversity(input: UniversityInput) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  const payload = universityInputSchema.parse(input);
  const slug = slugify(payload.slug || payload.name);
  const existing = await UniversityModel.findOne({ slug }).lean();

  if (existing) {
    throw new Error("A university with this slug already exists.");
  }

  const university = await UniversityModel.create({
    _id: randomUUID(),
    ...payload,
    slug,
    logo: payload.logo || null,
    logoUrl: payload.logo || null,
    coverImage: payload.coverImage || null,
    website: payload.website || null,
    email: payload.email || null,
    phone: payload.phone || null,
    locationName: payload.locationName || null,
    locationAddress: payload.locationAddress || null,
    locationLatitude: payload.locationLatitude,
    locationLongitude: payload.locationLongitude,
    locationSource:
      payload.locationLatitude !== null && payload.locationLongitude !== null
        ? "MANUAL"
        : null,
    domain: payload.website ? new URL(payload.website).hostname : null,
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId: String(university._id),
    action: "UNIVERSITY_CREATE",
    entityType: "university",
    entityId: String(university._id),
    after: serializeUniversity(university.toObject()),
  });

  return serializeUniversity(university.toObject());
}

export async function updateUniversity(
  universityId: string,
  input: UniversityInput,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  const payload = universityInputSchema.parse(input);
  const slug = slugify(payload.slug || payload.name);
  const duplicate = await UniversityModel.findOne({
    _id: { $ne: universityId },
    slug,
  }).lean();

  if (duplicate) {
    throw new Error("A university with this slug already exists.");
  }

  const before = await UniversityModel.findById(universityId).lean();

  if (!before) {
    throw new Error("University not found.");
  }

  const university = await UniversityModel.findByIdAndUpdate(
    universityId,
    {
      $set: {
        ...payload,
        slug,
        logo: payload.logo || null,
        logoUrl: payload.logo || null,
        coverImage: payload.coverImage || null,
        website: payload.website || null,
        email: payload.email || null,
        phone: payload.phone || null,
        locationName: payload.locationName || null,
        locationAddress: payload.locationAddress || null,
        locationLatitude: payload.locationLatitude,
        locationLongitude: payload.locationLongitude,
        locationSource:
          payload.locationLatitude !== null && payload.locationLongitude !== null
            ? "MANUAL"
            : null,
        domain: payload.website ? new URL(payload.website).hostname : null,
      },
    },
    { new: true },
  ).lean();

  if (!university) {
    throw new Error("University not found.");
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "UNIVERSITY_UPDATE",
    entityType: "university",
    entityId: universityId,
    before: serializeUniversity(before as Record<string, unknown>),
    after: serializeUniversity(university as Record<string, unknown>),
  });

  return serializeUniversity(university as Record<string, unknown>);
}

export async function deactivateUniversity(universityId: string) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  const before = await UniversityModel.findById(universityId).lean();

  const university = await UniversityModel.findByIdAndUpdate(
    universityId,
    { $set: { status: "INACTIVE" } },
    { new: true },
  ).lean();

  if (!university) {
    throw new Error("University not found.");
  }

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "UNIVERSITY_UPDATE",
    entityType: "university",
    entityId: universityId,
    before: before
      ? serializeUniversity(before as Record<string, unknown>)
      : null,
    after: serializeUniversity(university as Record<string, unknown>),
  });

  return serializeUniversity(university as Record<string, unknown>);
}

export async function getCampusAdminInvitations() {
  await requireSuperAdminSession();
  await connectMongo();

  const [invitations, universities] = await Promise.all([
    CampusAdminInvitationModel.find().sort({ createdAt: -1 }).lean(),
    UniversityModel.find().select({ name: 1 }).lean(),
  ]);

  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );

  return invitations.map((invitation) =>
    serializeInvitation(
      invitation as Record<string, unknown>,
      universityNames.get(String(invitation.universityId)) ??
        "Unknown university",
    ),
  );
}

export async function createCampusAdminInvitation(
  input: CampusAdminInvitationInput,
) {
  const session = await requireSuperAdminSession();
  await connectMongo();

  const payload = campusAdminInvitationInputSchema.parse(input);
  const university = await UniversityModel.findById(
    payload.universityId,
  ).lean();

  if (!university) {
    throw new Error("Selected university does not exist.");
  }

  const token = createToken();
  const invitation = await CampusAdminInvitationModel.create({
    _id: randomUUID(),
    token,
    universityId: payload.universityId,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    expiresAt: new Date(
      Date.now() + payload.expiresInDays * campusAdminInvitationTtlMs,
    ),
    status: "PENDING",
    invitedByUserId: session.user.id,
    sentAt: null,
  });
  await InvitationModel.create({
    _id: randomUUID(),
    token,
    type: "CAMPUS_ADMIN_INVITATION",
    email: null,
    universityId: payload.universityId,
    collegeId: null,
    departmentId: null,
    role: "CAMPUS_ADMIN",
    position: "NONE",
    createdBy: session.user.id,
    expiresAt: invitation.expiresAt,
    status: "PENDING",
    metadata: {
      legacyInvitationId: invitation._id,
    },
  });

  const serialized = serializeInvitation(
    invitation.toObject(),
    String(university.name),
  );

  console.info("CampusHub campus admin invitation generated", {
    universityId: payload.universityId,
    invitationUrl: serialized.invitationUrl,
  });
  await writeAuditLog({
    actorId: session.user.id,
    universityId: payload.universityId,
    action: "INVITATION_CREATED",
    entityType: "invitation",
    entityId: String(invitation._id),
    after: serialized,
  });
  await emitNotificationEvent({
    type: "INVITATION_CREATED",
    universityId: payload.universityId,
    actorId: session.user.id,
    entityType: "invitation",
    entityId: String(invitation._id),
  });

  return serialized;
}

export async function resolveCampusAdminActivation(token: string) {
  await connectMongo();

  const invitation = await CampusAdminInvitationModel.findOne({
    token,
    status: { $in: ["SENT", "PENDING"] },
  }).lean();

  if (!invitation) {
    return { status: "invalid" as const };
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    await CampusAdminInvitationModel.updateOne(
      { _id: invitation._id },
      { $set: { status: "EXPIRED" } },
    );

    return { status: "expired" as const, invitation };
  }

  const university = await UniversityModel.findById(
    invitation.universityId,
  ).lean();

  if (!university) {
    return { status: "invalid" as const };
  }

  return {
    status: "valid" as const,
    invitation,
    university: serializeUniversity(university as Record<string, unknown>),
  };
}

export async function activateCampusAdminAccount(
  input: CampusAdminActivationInput,
) {
  const payload = campusAdminActivationSchema.parse(input);
  const resolution = await resolveCampusAdminActivation(payload.token);

  if (resolution.status !== "valid") {
    return {
      ok: false as const,
      status: resolution.status,
    };
  }

  const email = payload.email.toLowerCase();
  const existingUser = await UserModel.findOne({ email }).lean();

  if (existingUser) {
    throw new Error("A CampusHub account already exists for this email.");
  }

  const name = `${payload.firstName} ${payload.lastName}`;

  const response = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password: payload.password,
      callbackURL: "/verification-success",
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phone,
      intendedRole: "CAMPUS_ADMIN",
      universityId: resolution.invitation.universityId,
      acquisitionSource: "CAMPUS_ADMIN_INVITATION",
      acquisitionToken: getAcquisitionSecret(),
    },
  });

  await UserModel.updateOne(
    { _id: response.user.id },
    { $set: { onboardingCompleted: true } },
  );

  await CampusAdminInvitationModel.updateOne(
    { _id: resolution.invitation._id, acceptedAt: null },
    {
      $set: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email,
        phone: payload.phone || null,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    },
  );
  await InvitationModel.updateOne(
    {
      token: payload.token,
      type: "CAMPUS_ADMIN_INVITATION",
      status: "PENDING",
    },
    {
      $set: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedBy: response.user.id,
        email,
      },
    },
  );
  await writeAuditLog({
    actorId: response.user.id,
    universityId: String(resolution.invitation.universityId),
    action: "INVITATION_ACCEPTED",
    entityType: "invitation",
    entityId: String(resolution.invitation._id),
  });
  await emitNotificationEvent({
    type: "INVITATION_ACCEPTED",
    universityId: String(resolution.invitation.universityId),
    actorId: response.user.id,
    recipientEmail: email,
    entityType: "invitation",
    entityId: String(resolution.invitation._id),
  });

  return {
    ok: true as const,
    userId: response.user.id,
  };
}
