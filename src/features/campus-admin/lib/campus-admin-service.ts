import { randomBytes, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import type { RoleKey } from "@/features/authorization/roles";
import type {
  CollegeInput,
  CourseInput,
  DepartmentInput,
  RepresentativeInvitationInput,
  TeacherInvitationInput,
} from "@/features/campus-admin/lib/schemas";
import {
  collegeInputSchema,
  courseInputSchema,
  departmentInputSchema,
  representativeInvitationInputSchema,
  teacherInvitationInputSchema,
} from "@/features/campus-admin/lib/schemas";
import { auth } from "@/lib/auth/auth";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, unauthorized } from "@/lib/api/response";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AlmanacEventModel,
  AnnouncementModel,
  CollegeModel,
  CourseModel,
  DepartmentModel,
  EventModel,
  InvitationModel,
  MapLocationModel,
  PollModel,
  ProjectModel,
  RepresentativeInvitationModel,
  ShopModel,
  StudentModel,
  TeacherInvitationModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthSession } from "@/types/auth";
import { withUniversityFilter } from "@/lib/tenant/tenant-query";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import { ApiError } from "@/lib/errors/api-error";

const invitationTtlMs = 1000 * 60 * 60 * 24;
const deletedFilter = { deletedAt: null };

function getRecentMonthBuckets(monthCount = 6) {
  const now = new Date();

  return Array.from({ length: monthCount }, (_, index) => {
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - (monthCount - 1 - index),
      1,
    );
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    return {
      label: start.toLocaleDateString("en-US", { month: "short" }),
      start,
      end,
    };
  });
}

function getCompletionPercentage(completed: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

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

export type SerializedCourse = {
  id: string;
  universityId: string;
  collegeId: string;
  collegeName: string;
  departmentId: string;
  departmentName: string;
  name: string;
  code: string;
  durationYears: number;
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
  departmentId: string | null;
  departmentName: string | null;
  courseId: string | null;
  courseName: string | null;
  yearOfStudy: number | null;
  expectedGraduationYear: number | null;
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

function serializeCourse(
  course: Record<string, unknown>,
  {
    collegeName,
    departmentName,
  }: {
    collegeName: string;
    departmentName: string;
  },
) {
  return {
    id: String(course._id),
    universityId: String(course.universityId),
    collegeId: String(course.collegeId),
    collegeName,
    departmentId: String(course.departmentId),
    departmentName,
    name: String(course.name),
    code: String(course.code),
    durationYears: Number(course.durationYears ?? 1),
    description: (course.description as string | null) ?? null,
    status: (course.status as SerializedCourse["status"]) ?? "ACTIVE",
    createdAt: serializeDate(course.createdAt),
    updatedAt: serializeDate(course.updatedAt),
  } satisfies SerializedCourse;
}

function serializeRepresentativeInvitation(
  invitation: Record<string, unknown>,
  {
    collegeName,
    departmentName,
    courseName,
  }: {
    collegeName: string;
    departmentName?: string | null;
    courseName?: string | null;
  },
) {
  const token = String(invitation.invitationToken);

  return {
    id: String(invitation._id),
    universityId: String(invitation.universityId),
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

async function getCourseNameMap(universityId: string) {
  const courses = await CourseModel.find({ universityId })
    .select({ name: 1 })
    .lean();

  return new Map(
    courses.map((course) => [String(course._id), String(course.name)]),
  );
}

export async function getCampusAdminDashboard() {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const universityId = session.user.universityId as string;
  const baseFilter = { universityId, ...deletedFilter };
  const recentMonths = getRecentMonthBuckets();

  const [
    collegesCount,
    departmentsCount,
    coursesCount,
    representativesCount,
    teachersCount,
    studentsCount,
    almanacEventsCount,
    mapLocationsCount,
    shopsCount,
    projectsCount,
    activityRows,
  ] = await Promise.all([
    CollegeModel.countDocuments(baseFilter),
    DepartmentModel.countDocuments(baseFilter),
    CourseModel.countDocuments(baseFilter),
    UserModel.countDocuments({
      ...baseFilter,
      $or: [
        { position: "REPRESENTATIVE" },
        { roles: "REPRESENTATIVE" },
        { studentLeadershipPositions: { $exists: true, $ne: [] } },
      ],
    }),
    UserModel.countDocuments({ ...baseFilter, roles: "TEACHER" }),
    StudentModel.countDocuments(baseFilter),
    AlmanacEventModel.countDocuments({ ...baseFilter, status: "ACTIVE" }),
    MapLocationModel.countDocuments({ ...baseFilter, status: "ACTIVE" }),
    ShopModel.countDocuments({ ...baseFilter, status: { $ne: "DELETED" } }),
    ProjectModel.countDocuments({ ...baseFilter, status: "PUBLISHED" }),
    Promise.all(
      recentMonths.map(async (bucket) => {
        const createdFilter = {
          ...baseFilter,
          createdAt: { $gte: bucket.start, $lt: bucket.end },
        };
        const [
          announcements,
          events,
          polls,
          projects,
          almanacEvents,
          shops,
        ] = await Promise.all([
          AnnouncementModel.countDocuments(createdFilter),
          EventModel.countDocuments(createdFilter),
          PollModel.countDocuments(createdFilter),
          ProjectModel.countDocuments(createdFilter),
          AlmanacEventModel.countDocuments(createdFilter),
          ShopModel.countDocuments(createdFilter),
        ]);

        return {
          label: bucket.label,
          primary: announcements + events + polls,
          secondary: projects + almanacEvents + shops,
        };
      }),
    ),
  ]);

  const readinessGoals = [
    {
      label: "Academic setup",
      value: getCompletionPercentage(
        [collegesCount, departmentsCount, coursesCount].filter(Boolean).length,
        3,
      ),
      detail: `${collegesCount} colleges, ${departmentsCount} departments, ${coursesCount} courses`,
      color: "var(--primary)",
    },
    {
      label: "People readiness",
      value: getCompletionPercentage(
        [representativesCount, teachersCount, studentsCount].filter(Boolean)
          .length,
        3,
      ),
      detail: `${representativesCount} reps, ${teachersCount} teachers, ${studentsCount} students`,
      color: "var(--chart-secondary)",
    },
    {
      label: "Experience coverage",
      value: getCompletionPercentage(
        [almanacEventsCount, mapLocationsCount, shopsCount, projectsCount].filter(
          Boolean,
        ).length,
        4,
      ),
      detail: `${almanacEventsCount} almanac events, ${mapLocationsCount} locations, ${shopsCount} shops, ${projectsCount} projects`,
      color: "var(--chart-tertiary)",
    },
  ];

  return {
    stats: {
      collegesCount,
      departmentsCount,
      representativesCount,
      teachersCount,
      studentsCount,
    },
    charts: {
      activity: activityRows,
      distribution: [
        { name: "Colleges", value: collegesCount, color: "var(--primary)" },
        {
          name: "Departments",
          value: departmentsCount,
          color: "var(--chart-secondary)",
        },
        {
          name: "Courses",
          value: coursesCount,
          color: "var(--chart-tertiary)",
        },
        { name: "Teachers", value: teachersCount, color: "#38bdf8" },
        { name: "Students", value: studentsCount, color: "#22c55e" },
      ].filter((item) => item.value > 0),
      readinessGoals,
    },
    engagement: {
      almanacEventsCount,
      mapLocationsCount,
      shopsCount,
      projectsCount,
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
  await connectPostgres();

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
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
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

export async function getCourses() {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const universityId = session.user.universityId as string;
  const [courses, collegeNames, departmentNames] = await Promise.all([
    CourseModel.find({ universityId }).sort({ createdAt: -1 }).lean(),
    getCollegeNameMap(universityId),
    getDepartmentNameMap(universityId),
  ]);

  return courses.map((course) =>
    serializeCourse(course as Record<string, unknown>, {
      collegeName: collegeNames.get(String(course.collegeId)) ?? "Unknown college",
      departmentName:
        departmentNames.get(String(course.departmentId)) ?? "Unknown department",
    }),
  );
}

export async function createCourse(input: CourseInput) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const payload = courseInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const code = normalizeCode(payload.code);
  const department = await DepartmentModel.findOne({
    _id: payload.departmentId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!department) {
    throw new Error("Selected department does not exist.");
  }

  const duplicate = await CourseModel.findOne({
    universityId,
    code,
    ...deletedFilter,
  }).lean();

  if (duplicate) {
    throw new ApiError({
      statusCode: 409,
      code: "COURSE_ALREADY_EXISTS",
      message: "A course with this code already exists.",
    });
  }

  const college = await CollegeModel.findById(department.collegeId).lean();
  const course = await CourseModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: department.collegeId,
    departmentId: payload.departmentId,
    name: payload.name,
    code,
    slug: slugify(payload.name),
    durationYears: payload.durationYears,
    description: payload.description,
    status: payload.status,
  });

  const serialized = serializeCourse(course.toObject(), {
    collegeName: college ? String(college.name) : "Unknown college",
    departmentName: String(department.name),
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "DEPARTMENT_CREATE",
    entityType: "course",
    entityId: String(course._id),
    after: serialized,
  });

  return serialized;
}

export async function updateCourse(courseId: string, input: CourseInput) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const payload = courseInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const code = normalizeCode(payload.code);
  const department = await DepartmentModel.findOne({
    _id: payload.departmentId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!department) {
    throw new Error("Selected department does not exist.");
  }

  const duplicate = await CourseModel.findOne({
    _id: { $ne: courseId },
    universityId,
    code,
    ...deletedFilter,
  }).lean();

  if (duplicate) {
    throw new ApiError({
      statusCode: 409,
      code: "COURSE_ALREADY_EXISTS",
      message: "A course with this code already exists.",
    });
  }

  const before = await CourseModel.findOne({
    _id: courseId,
    universityId,
    ...deletedFilter,
  }).lean();

  const course = await CourseModel.findOneAndUpdate(
    { _id: courseId, universityId, ...deletedFilter },
    {
      $set: {
        collegeId: department.collegeId,
        departmentId: payload.departmentId,
        name: payload.name,
        code,
        slug: slugify(payload.name),
        durationYears: payload.durationYears,
        description: payload.description,
        status: payload.status,
      },
    },
    { new: true },
  ).lean();

  if (!course) {
    throw new ApiError({
      statusCode: 404,
      code: "COURSE_NOT_FOUND",
      message: "Course not found.",
    });
  }

  const college = await CollegeModel.findById(department.collegeId).lean();
  const serialized = serializeCourse(course as Record<string, unknown>, {
    collegeName: college ? String(college.name) : "Unknown college",
    departmentName: String(department.name),
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "DEPARTMENT_UPDATE",
    entityType: "course",
    entityId: courseId,
    before: before
      ? serializeCourse(before as Record<string, unknown>, {
          collegeName: college ? String(college.name) : "Unknown college",
          departmentName: String(department.name),
        })
      : null,
    after: serialized,
  });

  return serialized;
}

export async function deactivateCourse(courseId: string) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const universityId = session.user.universityId as string;
  const before = await CourseModel.findOne({
    _id: courseId,
    universityId,
    ...deletedFilter,
  }).lean();
  const course = await CourseModel.findOneAndUpdate(
    { _id: courseId, universityId, ...deletedFilter },
    { $set: { status: "INACTIVE" } },
    { new: true },
  ).lean();

  if (!course) {
    throw new ApiError({
      statusCode: 404,
      code: "COURSE_NOT_FOUND",
      message: "Course not found.",
    });
  }

  const [college, department] = await Promise.all([
    CollegeModel.findById(course.collegeId).lean(),
    DepartmentModel.findById(course.departmentId).lean(),
  ]);
  const serialized = serializeCourse(course as Record<string, unknown>, {
    collegeName: college ? String(college.name) : "Unknown college",
    departmentName: department ? String(department.name) : "Unknown department",
  });

  await writeAuditLog({
    actorId: session.user.id,
    universityId,
    action: "DEPARTMENT_UPDATE",
    entityType: "course",
    entityId: courseId,
    before: before
      ? serializeCourse(before as Record<string, unknown>, {
          collegeName: college ? String(college.name) : "Unknown college",
          departmentName: department
            ? String(department.name)
            : "Unknown department",
        })
      : null,
    after: serialized,
  });

  return serialized;
}

export async function createDepartment(input: DepartmentInput) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
  const universityId = session.user.universityId as string;
  const [invitations, collegeNames, departmentNames, courseNames] =
    await Promise.all([
    RepresentativeInvitationModel.find({ universityId })
      .sort({ createdAt: -1 })
      .lean(),
    getCollegeNameMap(universityId),
      getDepartmentNameMap(universityId),
      getCourseNameMap(universityId),
    ]);

  return invitations.map((invitation) =>
    serializeRepresentativeInvitation(
      invitation as Record<string, unknown>,
      {
        collegeName:
          collegeNames.get(String(invitation.collegeId)) ?? "Unknown college",
        departmentName: invitation.departmentId
          ? departmentNames.get(String(invitation.departmentId)) ??
            "Unknown department"
          : null,
        courseName: invitation.courseId
          ? courseNames.get(String(invitation.courseId)) ?? "Unknown course"
          : null,
      },
    ),
  );
}

export async function createRepresentativeInvitation(
  input: RepresentativeInvitationInput,
) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const payload = representativeInvitationInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const course = await CourseModel.findOne({
    _id: payload.courseId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!course) {
    throw new Error("Selected course does not exist.");
  }
  if (payload.yearOfStudy > Number(course.durationYears ?? 1)) {
    throw new Error("Year of study cannot exceed the course duration.");
  }

  const [college, department] = await Promise.all([
    CollegeModel.findOne({ _id: course.collegeId, universityId }).lean(),
    DepartmentModel.findOne({ _id: course.departmentId, universityId }).lean(),
  ]);
  const enrollmentYear = new Date().getFullYear() - payload.yearOfStudy + 1;
  const expectedGraduationYear =
    enrollmentYear + Number(course.durationYears ?? 1);

  const invitationToken = createToken();
  const invitation = await RepresentativeInvitationModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: course.collegeId,
    departmentId: course.departmentId,
    courseId: payload.courseId,
    yearOfStudy: payload.yearOfStudy,
    enrollmentYear,
    expectedGraduationYear,
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
    collegeId: course.collegeId,
    departmentId: course.departmentId,
    courseId: payload.courseId,
    yearOfStudy: payload.yearOfStudy,
    enrollmentYear,
    expectedGraduationYear,
    role: "STUDENT",
    position: "REPRESENTATIVE",
    createdBy: session.user.id,
    expiresAt: invitation.expiresAt,
    status: "PENDING",
    metadata: {
      legacyInvitationId: invitation._id,
      courseDurationYears: course.durationYears,
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
    {
      collegeName: college ? String(college.name) : "Unknown college",
      departmentName: department ? String(department.name) : "Unknown department",
      courseName: String(course.name),
    },
  );
}

export async function updateRepresentativeInvitation(
  invitationId: string,
  input: RepresentativeInvitationInput,
) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
  const payload = representativeInvitationInputSchema.parse(input);
  const universityId = session.user.universityId as string;
  const course = await CourseModel.findOne({
    _id: payload.courseId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!course) {
    throw new Error("Selected course does not exist.");
  }
  if (payload.yearOfStudy > Number(course.durationYears ?? 1)) {
    throw new Error("Year of study cannot exceed the course duration.");
  }
  const [college, department] = await Promise.all([
    CollegeModel.findOne({ _id: course.collegeId, universityId }).lean(),
    DepartmentModel.findOne({ _id: course.departmentId, universityId }).lean(),
  ]);
  const enrollmentYear = new Date().getFullYear() - payload.yearOfStudy + 1;
  const expectedGraduationYear =
    enrollmentYear + Number(course.durationYears ?? 1);

  const invitation = await RepresentativeInvitationModel.findOneAndUpdate(
    { _id: invitationId, universityId },
    {
      $set: {
        collegeId: course.collegeId,
        departmentId: course.departmentId,
        courseId: payload.courseId,
        yearOfStudy: payload.yearOfStudy,
        enrollmentYear,
        expectedGraduationYear,
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
        collegeId: course.collegeId,
        departmentId: course.departmentId,
        courseId: payload.courseId,
        yearOfStudy: payload.yearOfStudy,
        enrollmentYear,
        expectedGraduationYear,
        expiresAt: invitation.expiresAt,
      },
    },
  );

  return serializeRepresentativeInvitation(
    invitation as Record<string, unknown>,
    {
      collegeName: college ? String(college.name) : "Unknown college",
      departmentName: department ? String(department.name) : "Unknown department",
      courseName: String(course.name),
    },
  );
}

export async function resendRepresentativeInvitation(invitationId: string) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
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

  const [college, department, course] = await Promise.all([
    CollegeModel.findById(invitation.collegeId).lean(),
    invitation.departmentId
      ? DepartmentModel.findById(invitation.departmentId).lean()
      : null,
    invitation.courseId ? CourseModel.findById(invitation.courseId).lean() : null,
  ]);

  return serializeRepresentativeInvitation(
    invitation as Record<string, unknown>,
    {
      collegeName: college ? String(college.name) : "Unknown college",
      departmentName: department ? String(department.name) : null,
      courseName: course ? String(course.name) : null,
    },
  );
}

export async function deactivateRepresentativeInvitation(invitationId: string) {
  const session = await requireCampusAdminSession();
  await connectPostgres();
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

  const [college, department, course] = await Promise.all([
    CollegeModel.findById(invitation.collegeId).lean(),
    invitation.departmentId
      ? DepartmentModel.findById(invitation.departmentId).lean()
      : null,
    invitation.courseId ? CourseModel.findById(invitation.courseId).lean() : null,
  ]);

  return serializeRepresentativeInvitation(
    invitation as Record<string, unknown>,
    {
      collegeName: college ? String(college.name) : "Unknown college",
      departmentName: department ? String(department.name) : null,
      courseName: course ? String(course.name) : null,
    },
  );
}

export async function getTeacherInvitations() {
  const session = await requireCampusAdminSession();
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
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
  await connectPostgres();
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
