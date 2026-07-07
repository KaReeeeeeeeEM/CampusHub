import { randomBytes, randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import {
  assignDepartmentSchema,
  campusAdminAssignmentSchema,
  collegeInputSchema,
  createTeacherManagementSchema,
  departmentInputSchema,
  listQuerySchema,
  representativeAssignmentSchema,
  representativeTransferSchema,
  universityInputSchema,
  updateTeacherManagementSchema,
  type CampusAdminAssignmentInput,
  type CreateTeacherManagementInput,
  type RepresentativeAssignmentInput,
  type RepresentativeTransferInput,
  type UpdateTeacherManagementInput,
} from "@/features/university-management/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import { requirePermission } from "@/lib/auth/authorization";
import { requireRole } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  CollegeModel,
  DepartmentModel,
  RepresentativeModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import { forbidden, notFound } from "@/lib/api/response";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
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

function createTemporaryPassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

function deriveNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "teacher";
  const segments = localPart
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: segments[0] ?? "CampusHub",
    lastName: segments.slice(1).join(" ") || "Teacher",
    username: slugify(localPart).replace(/-/g, ".") || `teacher.${Date.now()}`,
  };
}

function getRoles(user: { role?: string | null; roles?: string[] | null }) {
  return user.roles?.length ? user.roles : user.role ? [user.role] : [];
}

function hasRole(
  user: { role?: string | null; roles?: string[] | null },
  role: string,
) {
  return getRoles(user).includes(role);
}

function assertNotEmployer(user: {
  role?: string | null;
  roles?: string[] | null;
}) {
  if (hasRole(user, "EMPLOYER")) {
    throw forbidden("Employer accounts cannot be assigned campus roles.");
  }
}

function serializeUniversity(university: Record<string, unknown>) {
  return {
    id: String(university._id),
    name: String(university.name),
    shortName: (university.shortName as string | null) ?? null,
    slug: String(university.slug),
    logo: (university.logo as string | null) ?? null,
    description: (university.description as string | null) ?? null,
    website: (university.website as string | null) ?? null,
    email: (university.email as string | null) ?? null,
    phone: (university.phone as string | null) ?? null,
    country: (university.country as string | null) ?? null,
    region: (university.region as string | null) ?? null,
    status: String(university.status),
    deletedAt: serializeDate(university.deletedAt),
    createdAt: serializeDate(university.createdAt),
    updatedAt: serializeDate(university.updatedAt),
  };
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
    status: String(college.status),
    deletedAt: serializeDate(college.deletedAt),
    createdAt: serializeDate(college.createdAt),
    updatedAt: serializeDate(college.updatedAt),
  };
}

function serializeDepartment(department: Record<string, unknown>) {
  return {
    id: String(department._id),
    universityId: String(department.universityId),
    collegeId: String(department.collegeId),
    name: String(department.name),
    code: String(department.code),
    slug: (department.slug as string | null) ?? null,
    description: (department.description as string | null) ?? null,
    status: String(department.status),
    deletedAt: serializeDate(department.deletedAt),
    createdAt: serializeDate(department.createdAt),
    updatedAt: serializeDate(department.updatedAt),
  };
}

function serializeUser(user: Record<string, unknown>) {
  return {
    id: String(user._id),
    name: String(user.name),
    email: String(user.email),
    username: (user.username as string | null) ?? null,
    firstName: (user.firstName as string | null) ?? null,
    lastName: (user.lastName as string | null) ?? null,
    universityId: (user.universityId as string | null) ?? null,
    collegeId: (user.collegeId as string | null) ?? null,
    departmentId: (user.departmentId as string | null) ?? null,
    staffId: (user.staffId as string | null) ?? null,
    title: (user.title as string | null) ?? null,
    phone: (user.phone as string | null) ?? null,
    phoneNumber: (user.phoneNumber as string | null) ?? null,
    role: (user.role as string | null) ?? null,
    roles: Array.isArray(user.roles) ? user.roles.map(String) : [],
    position: (user.position as string | null) ?? "NONE",
    studentLeadershipPositions: Array.isArray(user.studentLeadershipPositions)
      ? user.studentLeadershipPositions.map(String)
      : [],
    status: String(user.status),
    deletedAt: serializeDate(user.deletedAt),
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
  };
}

function serializeRepresentative(record: Record<string, unknown>) {
  return {
    id: String(record._id),
    userId: String(record.userId),
    universityId: String(record.universityId),
    collegeId: String(record.collegeId),
    title: (record.title as string | null) ?? "College Representative",
    status: String(record.status),
    createdAt: serializeDate(record.createdAt),
    updatedAt: serializeDate(record.updatedAt),
  };
}

async function requireSuperAdminActor() {
  return requireRole(["SUPER_ADMIN"]);
}

async function requireCampusAdminActor() {
  const actor = await requireRole(["CAMPUS_ADMIN"]);

  if (!actor.universityId) {
    throw forbidden("Campus Admin is not assigned to a university.");
  }

  return actor;
}

async function assertActiveUniversity(universityId: string) {
  const university = await UniversityModel.findOne({
    _id: universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!university) {
    throw notFound("Active university not found.");
  }

  return university;
}

async function assertCollegeInUniversity(
  universityId: string,
  collegeId: string,
) {
  const college = await CollegeModel.findOne({
    _id: collegeId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!college) {
    throw notFound("College not found in this university.");
  }

  return college;
}

async function assertDepartmentInUniversity(
  universityId: string,
  departmentId: string,
  collegeId?: string,
) {
  const department = await DepartmentModel.findOne({
    _id: departmentId,
    universityId,
    ...(collegeId ? { collegeId } : {}),
    ...deletedFilter,
  }).lean();

  if (!department) {
    throw notFound("Department not found in this university.");
  }

  return department;
}

function activeFilter(includeInactive = false) {
  return includeInactive
    ? deletedFilter
    : { ...deletedFilter, status: "ACTIVE" };
}

export async function listUniversities(query: unknown = {}) {
  await requireSuperAdminActor();
  await connectPostgres();
  const options = listQuerySchema.parse(query);
  const universities = await UniversityModel.find(
    activeFilter(options.includeInactive),
  )
    .sort({ createdAt: -1 })
    .lean();

  return universities.map((university) =>
    serializeUniversity(university as Record<string, unknown>),
  );
}

export async function getUniversity(universityId: string) {
  await requireSuperAdminActor();
  await connectPostgres();
  const university = await UniversityModel.findOne({
    _id: universityId,
    ...deletedFilter,
  }).lean();

  if (!university) {
    throw notFound("University not found.");
  }

  return serializeUniversity(university as Record<string, unknown>);
}

export async function createUniversity(input: unknown) {
  const actor = await requireSuperAdminActor();
  await connectPostgres();
  const payload = universityInputSchema.parse(input);
  const slug = slugify(payload.slug || payload.name);
  const existing = await UniversityModel.findOne({
    slug,
    ...deletedFilter,
  }).lean();

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
    domain: payload.website ? new URL(payload.website).hostname : null,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(university._id),
    action: "UNIVERSITY_CREATE",
    entityType: "university",
    entityId: String(university._id),
    after: serializeUniversity(university.toObject()),
  });

  return serializeUniversity(university.toObject());
}

export async function updateUniversity(universityId: string, input: unknown) {
  const actor = await requireSuperAdminActor();
  await connectPostgres();
  const payload = universityInputSchema.parse(input);
  const slug = slugify(payload.slug || payload.name);
  const duplicate = await UniversityModel.findOne({
    _id: { $ne: universityId },
    slug,
    ...deletedFilter,
  }).lean();

  if (duplicate) {
    throw new Error("A university with this slug already exists.");
  }

  const before = await UniversityModel.findOne({
    _id: universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("University not found.");
  }

  const university = await UniversityModel.findOneAndUpdate(
    { _id: universityId, ...deletedFilter },
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
        domain: payload.website ? new URL(payload.website).hostname : null,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  if (!university) {
    throw notFound("University not found.");
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "UNIVERSITY_UPDATE",
    entityType: "university",
    entityId: universityId,
    before: serializeUniversity(before as Record<string, unknown>),
    after: serializeUniversity(university as Record<string, unknown>),
  });

  return serializeUniversity(university as Record<string, unknown>);
}

export async function softDeleteUniversity(universityId: string) {
  const actor = await requireSuperAdminActor();
  await connectPostgres();
  const before = await UniversityModel.findOne({
    _id: universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("University not found.");
  }

  const university = await UniversityModel.findOneAndUpdate(
    { _id: universityId, ...deletedFilter },
    {
      $set: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "UNIVERSITY_DELETE",
    entityType: "university",
    entityId: universityId,
    before: serializeUniversity(before as Record<string, unknown>),
    after: university
      ? serializeUniversity(university as Record<string, unknown>)
      : null,
  });

  return serializeUniversity(university as Record<string, unknown>);
}

export async function listColleges(query: unknown = {}) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const options = listQuerySchema.parse(query);
  const colleges = await CollegeModel.find({
    universityId: actor.universityId,
    ...activeFilter(options.includeInactive),
  })
    .sort({ name: 1 })
    .lean();

  return colleges.map((college) =>
    serializeCollege(college as Record<string, unknown>),
  );
}

export async function getCollege(collegeId: string) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const college = await CollegeModel.findOne({
    _id: collegeId,
    universityId: actor.universityId,
    ...deletedFilter,
  }).lean();

  if (!college) {
    throw notFound("College not found.");
  }

  return serializeCollege(college as Record<string, unknown>);
}

export async function createCollege(input: unknown) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const payload = collegeInputSchema.parse(input);
  const universityId = actor.universityId as string;
  const slug = slugify(payload.name);
  const code = normalizeCode(payload.code || payload.shortName || payload.name);
  const existing = await CollegeModel.findOne({
    universityId,
    ...deletedFilter,
    $or: [{ slug }, { code }, { name: payload.name }],
  }).lean();

  if (existing) {
    throw new Error("A college with this name or code already exists.");
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
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "COLLEGE_CREATE",
    entityType: "college",
    entityId: String(college._id),
    after: serializeCollege(college.toObject()),
  });

  return serializeCollege(college.toObject());
}

export async function updateCollege(collegeId: string, input: unknown) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const payload = collegeInputSchema.parse(input);
  const universityId = actor.universityId as string;
  const slug = slugify(payload.name);
  const code = normalizeCode(payload.code || payload.shortName || payload.name);
  const duplicate = await CollegeModel.findOne({
    _id: { $ne: collegeId },
    universityId,
    ...deletedFilter,
    $or: [{ slug }, { code }, { name: payload.name }],
  }).lean();

  if (duplicate) {
    throw new Error("A college with this name or code already exists.");
  }

  const before = await CollegeModel.findOne({
    _id: collegeId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("College not found.");
  }

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
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "COLLEGE_UPDATE",
    entityType: "college",
    entityId: collegeId,
    before: serializeCollege(before as Record<string, unknown>),
    after: college
      ? serializeCollege(college as Record<string, unknown>)
      : null,
  });

  return serializeCollege(college as Record<string, unknown>);
}

export async function softDeleteCollege(collegeId: string) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const universityId = actor.universityId as string;
  const before = await CollegeModel.findOne({
    _id: collegeId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("College not found.");
  }

  const college = await CollegeModel.findOneAndUpdate(
    { _id: collegeId, universityId, ...deletedFilter },
    {
      $set: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "COLLEGE_DELETE",
    entityType: "college",
    entityId: collegeId,
    before: serializeCollege(before as Record<string, unknown>),
    after: college
      ? serializeCollege(college as Record<string, unknown>)
      : null,
  });

  return serializeCollege(college as Record<string, unknown>);
}

export async function listDepartments(query: unknown = {}) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const options = listQuerySchema.parse(query);
  const departments = await DepartmentModel.find({
    universityId: actor.universityId,
    ...activeFilter(options.includeInactive),
  })
    .sort({ name: 1 })
    .lean();

  return departments.map((department) =>
    serializeDepartment(department as Record<string, unknown>),
  );
}

export async function getDepartment(departmentId: string) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const department = await DepartmentModel.findOne({
    _id: departmentId,
    universityId: actor.universityId,
    ...deletedFilter,
  }).lean();

  if (!department) {
    throw notFound("Department not found.");
  }

  return serializeDepartment(department as Record<string, unknown>);
}

export async function createDepartment(input: unknown) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const payload = departmentInputSchema.parse(input);
  const universityId = actor.universityId as string;
  await assertCollegeInUniversity(universityId, payload.collegeId);
  const code = normalizeCode(payload.code);
  const slug = slugify(payload.name);
  const existing = await DepartmentModel.findOne({
    universityId,
    collegeId: payload.collegeId,
    ...deletedFilter,
    $or: [{ slug }, { name: payload.name }],
  }).lean();

  if (existing) {
    throw new Error(
      "A department with this name already exists in this college.",
    );
  }

  const duplicateCode = await DepartmentModel.findOne({
    universityId,
    code,
    ...deletedFilter,
  }).lean();

  if (duplicateCode) {
    throw new Error("A department with this code already exists.");
  }

  const department = await DepartmentModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: payload.collegeId,
    name: payload.name,
    code,
    slug,
    description: payload.description,
    status: payload.status,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "DEPARTMENT_CREATE",
    entityType: "department",
    entityId: String(department._id),
    after: serializeDepartment(department.toObject()),
  });

  return serializeDepartment(department.toObject());
}

export async function updateDepartment(departmentId: string, input: unknown) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const payload = departmentInputSchema.parse(input);
  const universityId = actor.universityId as string;
  await assertCollegeInUniversity(universityId, payload.collegeId);
  const code = normalizeCode(payload.code);
  const slug = slugify(payload.name);
  const duplicateName = await DepartmentModel.findOne({
    _id: { $ne: departmentId },
    universityId,
    collegeId: payload.collegeId,
    ...deletedFilter,
    $or: [{ slug }, { name: payload.name }],
  }).lean();

  if (duplicateName) {
    throw new Error(
      "A department with this name already exists in this college.",
    );
  }

  const duplicateCode = await DepartmentModel.findOne({
    _id: { $ne: departmentId },
    universityId,
    code,
    ...deletedFilter,
  }).lean();

  if (duplicateCode) {
    throw new Error("A department with this code already exists.");
  }

  const before = await DepartmentModel.findOne({
    _id: departmentId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("Department not found.");
  }

  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, universityId, ...deletedFilter },
    {
      $set: {
        collegeId: payload.collegeId,
        name: payload.name,
        code,
        slug,
        description: payload.description,
        status: payload.status,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "DEPARTMENT_UPDATE",
    entityType: "department",
    entityId: departmentId,
    before: serializeDepartment(before as Record<string, unknown>),
    after: department
      ? serializeDepartment(department as Record<string, unknown>)
      : null,
  });

  return serializeDepartment(department as Record<string, unknown>);
}

export async function softDeleteDepartment(departmentId: string) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const universityId = actor.universityId as string;
  const before = await DepartmentModel.findOne({
    _id: departmentId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("Department not found.");
  }

  const department = await DepartmentModel.findOneAndUpdate(
    { _id: departmentId, universityId, ...deletedFilter },
    {
      $set: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "DEPARTMENT_DELETE",
    entityType: "department",
    entityId: departmentId,
    before: serializeDepartment(before as Record<string, unknown>),
    after: department
      ? serializeDepartment(department as Record<string, unknown>)
      : null,
  });

  return serializeDepartment(department as Record<string, unknown>);
}

async function findTeacher(actor: AuthUser, teacherId: string) {
  const teacher = await UserModel.findOne({
    _id: teacherId,
    universityId: actor.universityId,
    roles: "TEACHER",
    ...deletedFilter,
  }).lean();

  if (!teacher) {
    throw notFound("Teacher not found.");
  }

  return teacher;
}

export async function listTeachers(query: unknown = {}) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const options = listQuerySchema.parse(query);
  const teachers = await UserModel.find({
    universityId: actor.universityId,
    roles: "TEACHER",
    ...activeFilter(options.includeInactive),
  })
    .sort({ lastName: 1, firstName: 1 })
    .lean();

  return teachers.map((teacher) =>
    serializeUser(teacher as Record<string, unknown>),
  );
}

export async function getTeacher(teacherId: string) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const teacher = await findTeacher(actor, teacherId);

  return serializeUser(teacher as Record<string, unknown>);
}

export async function createTeacher(input: CreateTeacherManagementInput) {
  const actor = await requireCampusAdminActor();
  await requirePermission(PERMISSIONS.USER_CREATE);
  await connectPostgres();
  const payload = createTeacherManagementSchema.parse(input);
  const universityId = actor.universityId as string;
  const department = await assertDepartmentInUniversity(
    universityId,
    payload.departmentId,
  );
  const college = await assertCollegeInUniversity(
    universityId,
    String(department.collegeId),
  );
  const existingUser = await UserModel.findOne({
    email: payload.email.toLowerCase(),
  }).lean();

  if (existingUser) {
    throw new Error("A CampusHub account already exists for this email.");
  }

  const duplicateStaff = await UserModel.findOne({
    universityId,
    staffId: payload.staffId,
    ...deletedFilter,
  }).lean();

  if (duplicateStaff) {
    throw new Error("A teacher with this staff ID already exists.");
  }

  const derived = deriveNameFromEmail(payload.email);
  const firstName = payload.firstName ?? derived.firstName;
  const lastName = payload.lastName ?? derived.lastName;
  const username = payload.username ?? derived.username;
  const response = await auth.api.signUpEmail({
    body: {
      name: [firstName, payload.otherNames, lastName].filter(Boolean).join(" "),
      email: payload.email.toLowerCase(),
      password: payload.password ?? createTemporaryPassword(),
      callbackURL: "/verification-success",
      intendedRole: "TEACHER",
      username,
      firstName,
      lastName,
      otherNames: payload.otherNames ?? "",
      nickname: payload.nickname ?? "",
      phoneNumber: payload.phone,
      universityId,
      collegeId: String(college._id),
      departmentId: payload.departmentId,
      acquisitionSource: "TEACHER_CREATION",
      acquisitionToken: getAcquisitionSecret(),
    },
  });

  const teacher = await UserModel.findByIdAndUpdate(
    response.user.id,
    {
      $set: {
        staffId: payload.staffId,
        title: payload.title,
        phone: payload.phone || null,
        phoneNumber: payload.phone || null,
        status: payload.status,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "TEACHER_CREATED",
    entityType: "user",
    entityId: response.user.id,
    after: teacher ? serializeUser(teacher as Record<string, unknown>) : null,
  });

  return serializeUser(teacher as Record<string, unknown>);
}

export async function updateTeacher(
  teacherId: string,
  input: UpdateTeacherManagementInput,
) {
  const actor = await requireCampusAdminActor();
  await requirePermission(PERMISSIONS.USER_UPDATE);
  await connectPostgres();
  const payload = updateTeacherManagementSchema.parse(input);
  const universityId = actor.universityId as string;
  const before = await findTeacher(actor, teacherId);
  const update: Record<string, unknown> = {
    updatedById: actor.id,
  };

  if (payload.departmentId) {
    const department = await assertDepartmentInUniversity(
      universityId,
      payload.departmentId,
    );
    update.departmentId = payload.departmentId;
    update.collegeId = String(department.collegeId);
  }

  if (payload.staffId) {
    const duplicateStaff = await UserModel.findOne({
      _id: { $ne: teacherId },
      universityId,
      staffId: payload.staffId,
      ...deletedFilter,
    }).lean();

    if (duplicateStaff) {
      throw new Error("A teacher with this staff ID already exists.");
    }

    update.staffId = payload.staffId;
  }

  if (payload.email) {
    const duplicateEmail = await UserModel.findOne({
      _id: { $ne: teacherId },
      email: payload.email.toLowerCase(),
    }).lean();

    if (duplicateEmail) {
      throw new Error("A CampusHub account already exists for this email.");
    }

    update.email = payload.email.toLowerCase();
  }

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.phone !== undefined) {
    update.phone = payload.phone || null;
    update.phoneNumber = payload.phone || null;
  }
  if (payload.firstName !== undefined) update.firstName = payload.firstName;
  if (payload.lastName !== undefined) update.lastName = payload.lastName;
  if (payload.otherNames !== undefined) update.otherNames = payload.otherNames;
  if (payload.nickname !== undefined) update.nickname = payload.nickname;
  if (payload.status !== undefined) update.status = payload.status;

  if (payload.firstName || payload.lastName || payload.otherNames) {
    const firstName = payload.firstName ?? String(before.firstName);
    const lastName = payload.lastName ?? String(before.lastName);
    const otherNames = payload.otherNames ?? before.otherNames;
    update.name = [firstName, otherNames, lastName].filter(Boolean).join(" ");
  }

  const teacher = await UserModel.findOneAndUpdate(
    { _id: teacherId, universityId, roles: "TEACHER", ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "TEACHER_UPDATED",
    entityType: "user",
    entityId: teacherId,
    before: serializeUser(before as Record<string, unknown>),
    after: teacher ? serializeUser(teacher as Record<string, unknown>) : null,
  });

  return serializeUser(teacher as Record<string, unknown>);
}

export async function assignTeacherDepartment(
  teacherId: string,
  input: unknown,
) {
  const payload = assignDepartmentSchema.parse(input);
  return updateTeacher(teacherId, { departmentId: payload.departmentId });
}

export async function deactivateTeacher(teacherId: string) {
  const actor = await requireCampusAdminActor();
  await requirePermission(PERMISSIONS.USER_UPDATE);
  await connectPostgres();
  const universityId = actor.universityId as string;
  const before = await findTeacher(actor, teacherId);
  const teacher = await UserModel.findOneAndUpdate(
    { _id: teacherId, universityId, roles: "TEACHER", ...deletedFilter },
    {
      $set: {
        status: "INACTIVE",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "TEACHER_UPDATED",
    entityType: "user",
    entityId: teacherId,
    before: serializeUser(before as Record<string, unknown>),
    after: teacher ? serializeUser(teacher as Record<string, unknown>) : null,
  });

  return serializeUser(teacher as Record<string, unknown>);
}

export async function listRepresentatives(query: unknown = {}) {
  const actor = await requireCampusAdminActor();
  await connectPostgres();
  const options = listQuerySchema.parse(query);
  const representatives = await RepresentativeModel.find({
    universityId: actor.universityId,
    ...(options.includeInactive ? {} : { status: "ACTIVE" }),
  })
    .sort({ createdAt: -1 })
    .lean();

  return representatives.map((representative) =>
    serializeRepresentative(representative as Record<string, unknown>),
  );
}

export async function assignRepresentative(
  input: RepresentativeAssignmentInput,
) {
  const actor = await requireCampusAdminActor();
  await requirePermission(PERMISSIONS.USER_ASSIGN_POSITION);
  await connectPostgres();
  const payload = representativeAssignmentSchema.parse(input);
  const universityId = actor.universityId as string;
  await assertCollegeInUniversity(universityId, payload.collegeId);
  const user = await UserModel.findOne({
    _id: payload.userId,
    universityId,
    roles: "STUDENT",
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!user) {
    throw forbidden(
      "Representative must be an active student in this university.",
    );
  }

  assertNotEmployer(user);

  const representative = await RepresentativeModel.findOneAndUpdate(
    { userId: payload.userId },
    {
      $set: {
        universityId,
        collegeId: payload.collegeId,
        title: payload.title,
        status: "ACTIVE",
      },
      $setOnInsert: {
        _id: randomUUID(),
        userId: payload.userId,
      },
    },
    { upsert: true, new: true },
  ).lean();

  const updatedUser = await UserModel.findByIdAndUpdate(
    payload.userId,
    {
      $set: {
        position: "REPRESENTATIVE",
        collegeId: payload.collegeId,
        updatedById: actor.id,
      },
      $addToSet: {
        studentLeadershipPositions: "REPRESENTATIVE",
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "REPRESENTATIVE_ASSIGNED",
    entityType: "representative",
    entityId: String(representative?._id),
    after: {
      representative: representative
        ? serializeRepresentative(representative as Record<string, unknown>)
        : null,
      user: updatedUser
        ? serializeUser(updatedUser as Record<string, unknown>)
        : null,
    },
  });

  return {
    representative: serializeRepresentative(
      representative as Record<string, unknown>,
    ),
    user: serializeUser(updatedUser as Record<string, unknown>),
  };
}

async function findRepresentativeByIdOrUserId(actor: AuthUser, id: string) {
  const representative = await RepresentativeModel.findOne({
    universityId: actor.universityId,
    $or: [{ _id: id }, { userId: id }],
  }).lean();

  if (!representative) {
    throw notFound("Representative not found.");
  }

  return representative;
}

export async function transferRepresentative(
  representativeId: string,
  input: RepresentativeTransferInput,
) {
  const actor = await requireCampusAdminActor();
  await requirePermission(PERMISSIONS.USER_ASSIGN_POSITION);
  await connectPostgres();
  const payload = representativeTransferSchema.parse(input);
  const universityId = actor.universityId as string;
  await assertCollegeInUniversity(universityId, payload.collegeId);
  const before = await findRepresentativeByIdOrUserId(actor, representativeId);
  const representative = await RepresentativeModel.findOneAndUpdate(
    { _id: before._id, universityId },
    {
      $set: {
        collegeId: payload.collegeId,
        ...(payload.title ? { title: payload.title } : {}),
        status: "ACTIVE",
      },
    },
    { new: true },
  ).lean();
  const user = await UserModel.findByIdAndUpdate(
    before.userId,
    {
      $set: {
        collegeId: payload.collegeId,
        position: "REPRESENTATIVE",
        updatedById: actor.id,
      },
      $addToSet: {
        studentLeadershipPositions: "REPRESENTATIVE",
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "REPRESENTATIVE_ASSIGNED",
    entityType: "representative",
    entityId: String(before._id),
    before: serializeRepresentative(before as Record<string, unknown>),
    after: representative
      ? serializeRepresentative(representative as Record<string, unknown>)
      : null,
  });

  return {
    representative: serializeRepresentative(
      representative as Record<string, unknown>,
    ),
    user: user ? serializeUser(user as Record<string, unknown>) : null,
  };
}

export async function removeRepresentative(representativeId: string) {
  const actor = await requireCampusAdminActor();
  await requirePermission(PERMISSIONS.USER_ASSIGN_POSITION);
  await connectPostgres();
  const universityId = actor.universityId as string;
  const before = await findRepresentativeByIdOrUserId(actor, representativeId);
  const representative = await RepresentativeModel.findOneAndUpdate(
    { _id: before._id, universityId },
    {
      $set: {
        status: "INACTIVE",
      },
    },
    { new: true },
  ).lean();
  const user = await UserModel.findByIdAndUpdate(
    before.userId,
    {
      $set: {
        position: "NONE",
        updatedById: actor.id,
      },
      $pull: {
        studentLeadershipPositions: "REPRESENTATIVE",
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "REPRESENTATIVE_REMOVED",
    entityType: "representative",
    entityId: String(before._id),
    before: serializeRepresentative(before as Record<string, unknown>),
    after: representative
      ? serializeRepresentative(representative as Record<string, unknown>)
      : null,
  });

  return {
    representative: serializeRepresentative(
      representative as Record<string, unknown>,
    ),
    user: user ? serializeUser(user as Record<string, unknown>) : null,
  };
}

export async function listCampusAdmins(universityId: string) {
  await requireSuperAdminActor();
  await connectPostgres();
  await assertActiveUniversity(universityId);
  const users = await UserModel.find({
    universityId,
    roles: "CAMPUS_ADMIN",
    ...deletedFilter,
  })
    .sort({ lastName: 1, firstName: 1 })
    .lean();

  return users.map((user) => serializeUser(user as Record<string, unknown>));
}

export async function assignCampusAdmin(
  universityId: string,
  input: CampusAdminAssignmentInput,
) {
  const actor = await requireSuperAdminActor();
  await connectPostgres();
  const payload = campusAdminAssignmentSchema.parse(input);
  await assertActiveUniversity(universityId);
  const user = await UserModel.findOne({
    _id: payload.userId,
    ...deletedFilter,
  }).lean();

  if (!user) {
    throw notFound("User not found.");
  }

  assertNotEmployer(user);

  const updatedUser = await UserModel.findByIdAndUpdate(
    payload.userId,
    {
      $set: {
        role: "CAMPUS_ADMIN",
        roles: ["CAMPUS_ADMIN"],
        universityId,
        collegeId: null,
        departmentId: null,
        position: "NONE",
        studentLeadershipPositions: [],
        status: "ACTIVE",
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "CAMPUS_ADMIN_ASSIGNED",
    entityType: "user",
    entityId: payload.userId,
    before: serializeUser(user as Record<string, unknown>),
    after: updatedUser
      ? serializeUser(updatedUser as Record<string, unknown>)
      : null,
  });

  return serializeUser(updatedUser as Record<string, unknown>);
}

export async function removeCampusAdmin(universityId: string, userId: string) {
  const actor = await requireSuperAdminActor();
  await connectPostgres();
  await assertActiveUniversity(universityId);
  const user = await UserModel.findOne({
    _id: userId,
    universityId,
    roles: "CAMPUS_ADMIN",
    ...deletedFilter,
  }).lean();

  if (!user) {
    throw notFound("Campus Admin not found.");
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        role: "STUDENT",
        roles: ["STUDENT"],
        universityId: null,
        collegeId: null,
        departmentId: null,
        position: "NONE",
        studentLeadershipPositions: [],
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "CAMPUS_ADMIN_REMOVED",
    entityType: "user",
    entityId: userId,
    before: serializeUser(user as Record<string, unknown>),
    after: updatedUser
      ? serializeUser(updatedUser as Record<string, unknown>)
      : null,
  });

  return serializeUser(updatedUser as Record<string, unknown>);
}

export async function getUniversityDashboardStats(universityId?: string) {
  const actor = universityId
    ? await requireSuperAdminActor()
    : await requireCampusAdminActor();
  await connectPostgres();
  const scopedUniversityId = universityId ?? actor.universityId;

  if (!scopedUniversityId) {
    throw forbidden("University scope is required.");
  }

  if (
    actor.role !== "SUPER_ADMIN" &&
    actor.universityId !== scopedUniversityId
  ) {
    throw forbidden("You cannot access another university dashboard.");
  }

  await assertActiveUniversity(scopedUniversityId);

  const [
    totalStudents,
    totalTeachers,
    totalColleges,
    totalDepartments,
    totalRepresentatives,
    activeUsers,
  ] = await Promise.all([
    UserModel.countDocuments({
      universityId: scopedUniversityId,
      roles: "STUDENT",
      ...deletedFilter,
    }),
    UserModel.countDocuments({
      universityId: scopedUniversityId,
      roles: "TEACHER",
      ...deletedFilter,
    }),
    CollegeModel.countDocuments({
      universityId: scopedUniversityId,
      ...deletedFilter,
    }),
    DepartmentModel.countDocuments({
      universityId: scopedUniversityId,
      ...deletedFilter,
    }),
    RepresentativeModel.countDocuments({
      universityId: scopedUniversityId,
      status: "ACTIVE",
    }),
    UserModel.countDocuments({
      universityId: scopedUniversityId,
      status: "ACTIVE",
      ...deletedFilter,
    }),
  ]);

  return {
    universityId: scopedUniversityId,
    totalStudents,
    totalTeachers,
    totalColleges,
    totalDepartments,
    totalRepresentatives,
    activeUsers,
  };
}
