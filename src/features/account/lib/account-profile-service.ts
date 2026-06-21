import { requireAuth } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AlmanacModel,
  AlumniProfileModel,
  AnnouncementModel,
  CollegeModel,
  DepartmentModel,
  EventModel,
  LostFoundItemModel,
  MapLocationModel,
  PollModel,
  ProductModel,
  ProjectModel,
  RepresentativeInvitationModel,
  RepresentativeModel,
  ShopModel,
  StudentModel,
  TeacherInvitationModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import { z } from "zod";

const deletedFilter = { deletedAt: null };
const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
const profileStickerValues = [
  "kibo-happy",
  "kibo-curious",
  "kibo-proud",
  "kibo-sleepy",
  "kibo-thinking",
  "kibo-celebrate",
  "kibo-wave",
  "kibo-jumping",
  "kibo-reading",
  "kibo-peek",
] as const;

type CountableModel = {
  countDocuments: (
    filter: Record<string, unknown>,
  ) => Promise<number> | { exec: () => Promise<number> };
};

function nullableProfileString(maxLength: number) {
  return z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(maxLength).nullable().optional(),
  );
}

const profileImageReferenceSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z
    .string()
    .trim()
    .max(3_000_000, "Image is too large.")
    .refine(
      (value) => {
        if (value.startsWith("data:image/")) return true;

        return z.string().url().safeParse(value).success;
      },
      { message: "Image must be a valid URL or uploaded image." },
    )
    .nullable()
    .optional(),
);

const accountProfileMediaSchema = z
  .object({
    avatar: profileImageReferenceSchema,
    coverImage: profileImageReferenceSchema,
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phoneNumber: nullableProfileString(40),
    bio: nullableProfileString(600),
    gender: nullableProfileString(40),
    profileSticker: z
      .preprocess(
        (value) => (value === "" || value === "NONE" ? null : value),
        z.enum(profileStickerValues).nullable().optional(),
      ),
    dateOfBirth: z.preprocess(
      (value) => (value === "" ? null : value),
      z.coerce.date().nullable().optional(),
    ),
  })
  .refine(
    (value) =>
      Object.values(value).some((entry) => entry !== undefined),
    {
      message: "No profile changes were provided.",
    },
  );

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

async function countModel(model: CountableModel, filter: Record<string, unknown>) {
  const result = model.countDocuments(filter);

  if (typeof result === "object" && result !== null && "exec" in result) {
    return result.exec();
  }

  return result;
}

function buildMonthBuckets() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    return {
      label: monthFormatter.format(start),
      start,
      end,
    };
  });
}

async function countMonthly(
  model: CountableModel,
  universityId: string,
  buckets: ReturnType<typeof buildMonthBuckets>,
) {
  return Promise.all(
    buckets.map((bucket) =>
      countModel(model, {
        universityId,
        createdAt: { $gte: bucket.start, $lt: bucket.end },
      }),
    ),
  );
}

export type AccountProfile = {
  id: string;
  name: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  otherNames: string | null;
  nickname: string | null;
  username: string | null;
  avatar: string | null;
  image: string | null;
  coverImage: string | null;
  profileSticker: string | null;
  bio: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  role: string;
  roles: string[];
  universityId: string | null;
  universityName: string | null;
  collegeId: string | null;
  collegeName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  title: string | null;
  position: string | null;
  staffId: string | null;
  studentId: string | null;
  status: string;
  profileCompletionPercentage: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AccountProfileAnalytics = {
  summary: Array<{
    label: string;
    value: number;
    description: string;
  }>;
  people: Array<{
    name: string;
    value: number;
  }>;
  structure: Array<{
    name: string;
    value: number;
  }>;
  activityTrend: Array<{
    month: string;
    announcements: number;
    events: number;
    polls: number;
  }>;
  operations: Array<{
    name: string;
    value: number;
  }>;
};

export async function getAccountProfileAnalytics(): Promise<AccountProfileAnalytics | null> {
  const actor = await requireAuth();
  await connectMongo();

  const universityId = actor.universityId;

  if (!universityId) {
    return null;
  }

  const monthBuckets = buildMonthBuckets();
  const baseFilter = { universityId, ...deletedFilter };
  const userRoleFilter = (role: string) => ({
    universityId,
    ...deletedFilter,
    $or: [{ role }, { roles: role }],
  });

  const [
    colleges,
    departments,
    students,
    teachers,
    representatives,
    alumni,
    pendingTeachers,
    pendingRepresentatives,
    announcements,
    events,
    polls,
    projects,
    shops,
    products,
    almanacs,
    mapPoints,
    lostFound,
    monthlyAnnouncements,
    monthlyEvents,
    monthlyPolls,
  ] = await Promise.all([
    countModel(CollegeModel, baseFilter),
    countModel(DepartmentModel, baseFilter),
    countModel(StudentModel, { universityId }),
    countModel(UserModel, userRoleFilter("TEACHER")),
    countModel(RepresentativeModel, { universityId }),
    countModel(AlumniProfileModel, baseFilter),
    countModel(TeacherInvitationModel, { universityId, status: "SENT" }),
    countModel(RepresentativeInvitationModel, { universityId, status: "SENT" }),
    countModel(AnnouncementModel, baseFilter),
    countModel(EventModel, baseFilter),
    countModel(PollModel, baseFilter),
    countModel(ProjectModel, baseFilter),
    countModel(ShopModel, baseFilter),
    countModel(ProductModel, baseFilter),
    countModel(AlmanacModel, baseFilter),
    countModel(MapLocationModel, baseFilter),
    countModel(LostFoundItemModel, baseFilter),
    countMonthly(AnnouncementModel, universityId, monthBuckets),
    countMonthly(EventModel, universityId, monthBuckets),
    countMonthly(PollModel, universityId, monthBuckets),
  ]);

  return {
    summary: [
      {
        label: "Academic Structure",
        value: colleges + departments,
        description: "Colleges and departments configured",
      },
      {
        label: "Campus People",
        value: students + teachers + representatives + alumni,
        description: "Students, teachers, representatives, and alumni",
      },
      {
        label: "Published Activity",
        value: announcements + events + polls,
        description: "Announcements, events, and polls",
      },
      {
        label: "Operational Records",
        value: projects + shops + products + mapPoints + lostFound,
        description: "Showcase, marketplace, map, and lost & found",
      },
    ],
    people: [
      { name: "Students", value: students },
      { name: "Teachers", value: teachers },
      { name: "Representatives", value: representatives },
      { name: "Alumni", value: alumni },
      { name: "Pending Invites", value: pendingTeachers + pendingRepresentatives },
    ],
    structure: [
      { name: "Colleges", value: colleges },
      { name: "Departments", value: departments },
      { name: "Almanacs", value: almanacs },
    ],
    activityTrend: monthBuckets.map((bucket, index) => ({
      month: bucket.label,
      announcements: monthlyAnnouncements[index] ?? 0,
      events: monthlyEvents[index] ?? 0,
      polls: monthlyPolls[index] ?? 0,
    })),
    operations: [
      { name: "Projects", value: projects },
      { name: "Shops", value: shops },
      { name: "Products", value: products },
      { name: "Map Points", value: mapPoints },
      { name: "Lost & Found", value: lostFound },
    ],
  };
}

export async function getAccountProfile(): Promise<AccountProfile> {
  const actor = await requireAuth();
  await connectMongo();

  const user = await UserModel.findById(actor.id).lean();
  if (!user) {
    return {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      firstName: actor.firstName ?? null,
      lastName: actor.lastName ?? null,
      otherNames: actor.otherNames ?? null,
      nickname: actor.nickname ?? null,
      username: null,
      avatar: actor.avatar ?? null,
      image: actor.image ?? null,
      coverImage: null,
      profileSticker: null,
      bio: null,
      gender: null,
      dateOfBirth: null,
      phoneNumber: actor.phoneNumber ?? null,
      role: actor.role,
      roles: actor.roles ?? [],
      universityId: actor.universityId ?? null,
      universityName: null,
      collegeId: actor.collegeId ?? null,
      collegeName: null,
      departmentId: actor.departmentId ?? null,
      departmentName: null,
      title: null,
      position: typeof actor.position === "string" ? actor.position : null,
      staffId: null,
      studentId: null,
      status: String(actor.status ?? "ACTIVE"),
      profileCompletionPercentage: actor.profileCompletionPercentage ?? 0,
      createdAt: null,
      updatedAt: null,
    };
  }

  const universityId = stringValue(user.universityId);
  const collegeId = stringValue(user.collegeId);
  const departmentId = stringValue(user.departmentId);

  const [university, college, department] = await Promise.all([
    universityId
      ? UniversityModel.findOne({ _id: universityId, ...deletedFilter })
          .select("name")
          .lean()
      : null,
    collegeId
      ? CollegeModel.findOne({ _id: collegeId, ...deletedFilter })
          .select("name")
          .lean()
      : null,
    departmentId
      ? DepartmentModel.findOne({ _id: departmentId, ...deletedFilter })
          .select("name collegeId")
          .lean()
      : null,
  ]);

  const fallbackCollege =
    !college && department?.collegeId
      ? await CollegeModel.findOne({
          _id: String(department.collegeId),
          ...deletedFilter,
        })
          .select("name")
          .lean()
      : null;

  return {
    id: String(user._id),
    name: stringValue(user.name),
    email: String(user.email),
    firstName: stringValue(user.firstName),
    lastName: stringValue(user.lastName),
    otherNames: stringValue(user.otherNames),
    nickname: stringValue(user.nickname),
    username: stringValue(user.username),
    avatar: stringValue(user.avatar),
    image: stringValue(user.image),
    coverImage: stringValue(user.coverImage),
    profileSticker: stringValue(user.profileSticker),
    bio: stringValue(user.bio),
    gender: stringValue(user.gender),
    dateOfBirth: serializeDate(user.dateOfBirth),
    phoneNumber: stringValue(user.phoneNumber ?? user.phone),
    role: String(user.role ?? actor.role),
    roles: Array.isArray(user.roles) ? user.roles.map(String) : actor.roles ?? [],
    universityId,
    universityName: university ? String(university.name) : null,
    collegeId: collegeId ?? (department?.collegeId ? String(department.collegeId) : null),
    collegeName: college
      ? String(college.name)
      : fallbackCollege
        ? String(fallbackCollege.name)
        : null,
    departmentId,
    departmentName: department ? String(department.name) : null,
    title: stringValue(user.title),
    position: stringValue(user.position),
    staffId: stringValue(user.staffId),
    studentId: stringValue(user.studentId),
    status: String(user.status ?? "ACTIVE"),
    profileCompletionPercentage:
      typeof user.profileCompletionPercentage === "number"
        ? user.profileCompletionPercentage
        : 0,
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
  };
}

export async function updateAccountProfile(input: unknown) {
  const actor = await requireAuth();
  const payload = accountProfileMediaSchema.parse(input);

  await connectMongo();

  const existing = await UserModel.findById(actor.id)
    .select(
      "avatar image coverImage profileSticker firstName lastName phone phoneNumber bio gender dateOfBirth",
    )
    .lean();

  if (!existing) {
    throw new Error("User profile not found.");
  }

  const update: Record<string, unknown> = {};

  if (payload.avatar !== undefined) {
    update.avatar = payload.avatar;
    update.image = payload.avatar ?? null;
  }

  if (payload.coverImage !== undefined) {
    update.coverImage = payload.coverImage;
  }

  if (payload.profileSticker !== undefined) {
    update.profileSticker = payload.profileSticker;
  }

  if (payload.firstName !== undefined) {
    update.firstName = payload.firstName;
  }

  if (payload.lastName !== undefined) {
    update.lastName = payload.lastName;
  }

  if (payload.firstName !== undefined || payload.lastName !== undefined) {
    const firstName = payload.firstName ?? String(existing.firstName ?? "");
    const lastName = payload.lastName ?? String(existing.lastName ?? "");
    update.name = [firstName, lastName].filter(Boolean).join(" ").trim();
  }

  if (payload.phoneNumber !== undefined) {
    update.phoneNumber = payload.phoneNumber;
    update.phone = payload.phoneNumber;
  }

  if (payload.bio !== undefined) {
    update.bio = payload.bio;
  }

  if (payload.gender !== undefined) {
    update.gender = payload.gender;
  }

  if (payload.dateOfBirth !== undefined) {
    update.dateOfBirth = payload.dateOfBirth;
  }

  await UserModel.updateOne({ _id: actor.id }, { $set: update });

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId ?? null,
    action: "PROFILE_UPDATE",
    entityType: "user",
    entityId: actor.id,
    before: {
      avatar: existing.avatar,
      image: existing.image,
      coverImage: existing.coverImage,
      profileSticker: existing.profileSticker,
      firstName: existing.firstName,
      lastName: existing.lastName,
      phoneNumber: existing.phoneNumber,
      bio: existing.bio,
      gender: existing.gender,
      dateOfBirth: existing.dateOfBirth,
    },
    after: update,
  });

  return getAccountProfile();
}
