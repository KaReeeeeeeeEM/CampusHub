import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ApplicationModel,
  CareerProfileModel,
  CollegeModel,
  DepartmentModel,
  EmployerApplicationModel,
  OpportunityModel,
  ProjectDocumentModel,
  ProjectModel,
  SavedCandidateModel,
  UniversityModel,
  UserModel,
  UserXpProfileModel,
} from "@/lib/db/models";
import { formatCompactNumber } from "@/lib/number-format";
import { z } from "zod";

const deletedFilter = { deletedAt: null };

type LeanRecord = Record<string, unknown>;

const employerCompanySchema = z.object({
  companyName: z.string().trim().min(2).max(140),
  industry: z.string().trim().min(2).max(120),
  companySize: z.string().trim().min(1).max(80),
  location: z.string().trim().min(2).max(140),
  website: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().url().nullable().optional(),
  ),
  contactPerson: z.string().trim().min(2).max(120),
  position: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(3).max(40),
  description: z.string().trim().min(10).max(900),
  recruitmentInterests: z
    .array(z.string().trim().min(1).max(80))
    .max(12)
    .optional(),
});

function stringValue(value: unknown, fallback = "Not set") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dateValue(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildEmployerTrendData({
  users,
  projects,
  opportunities,
}: {
  users: LeanRecord[];
  projects: LeanRecord[];
  opportunities: LeanRecord[];
}) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

    return {
      key: monthKey(date),
      label: monthLabels[date.getMonth()],
      candidates: 0,
      projects: 0,
      opportunities: 0,
    };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const user of users) {
    const createdAt = dateValue(user.createdAt);
    const bucket = createdAt ? byKey.get(monthKey(createdAt)) : null;

    if (bucket) bucket.candidates += 1;
  }

  for (const project of projects) {
    const createdAt = dateValue(project.createdAt);
    const bucket = createdAt ? byKey.get(monthKey(createdAt)) : null;

    if (bucket) bucket.projects += 1;
  }

  for (const opportunity of opportunities) {
    const createdAt = dateValue(opportunity.createdAt);
    const bucket = createdAt ? byKey.get(monthKey(createdAt)) : null;

    if (bucket) bucket.opportunities += 1;
  }

  if (
    buckets.every(
      (bucket) =>
        bucket.candidates === 0 &&
        bucket.projects === 0 &&
        bucket.opportunities === 0,
    )
  ) {
    const latest = buckets.at(-1);

    if (latest) {
      latest.candidates = users.length;
      latest.projects = projects.length;
      latest.opportunities = opportunities.length;
    }
  }

  return buckets.map(({ key: _key, ...bucket }) => bucket);
}

function topCounts<T extends string>(
  values: T[],
  labels: Map<T, string>,
  fallback: string,
) {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      id,
      label: labels.get(id) ?? fallback,
      value: count,
    }));
}

function stringId(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function metadataObject(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function getEmployerOverrides(user: LeanRecord | null) {
  const metadata = metadataObject(user?.metadata);
  return metadataObject(metadata.employerCompany);
}

function mergeEmployerCompany(
  application: LeanRecord | null,
  user: LeanRecord | null,
) {
  const overrides = getEmployerOverrides(user);
  const companyName =
    stringValue(overrides.companyName, "") ||
    stringValue(application?.companyName, "") ||
    stringValue(user?.name, "Employer company");
  const contactPerson =
    stringValue(overrides.contactPerson, "") ||
    stringValue(application?.contactPerson, "") ||
    stringValue(user?.name, "Not set");

  return {
    companyName,
    industry:
      stringValue(overrides.industry, "") ||
      stringValue(application?.industry, "Not set"),
    companySize:
      stringValue(overrides.companySize, "") ||
      stringValue(application?.companySize, "Not set"),
    location:
      stringValue(overrides.location, "") ||
      stringValue(application?.country, "Not set"),
    website:
      stringValue(overrides.website, "") ||
      stringValue(application?.website, ""),
    contactPerson,
    position:
      stringValue(overrides.position, "") ||
      stringValue(application?.position, "Not set"),
    email: stringValue(user?.email, stringValue(application?.email, "Not set")),
    phone:
      stringValue(overrides.phone, "") ||
      stringValue(application?.phone, stringValue(user?.phoneNumber, "Not set")),
    description:
      stringValue(overrides.description, "") ||
      stringValue(application?.description, "") ||
      stringValue(application?.reasonForJoining, "No company description added yet."),
    recruitmentInterests: Array.isArray(overrides.recruitmentInterests)
      ? overrides.recruitmentInterests.map(String).filter(Boolean)
      : [],
  };
}

function universityAllowsEmployers(university: LeanRecord) {
  const settings =
    typeof university.settings === "object" && university.settings
      ? (university.settings as Record<string, unknown>)
      : {};

  return (
    settings.employerAccessEnabled !== false &&
    settings.allowEmployerAccess !== false &&
    settings.employerVisibilityEnabled !== false
  );
}

export async function getEmployerPortalSummary() {
  const actor = await requireAuth();
  const roles = new Set([actor.role, ...(actor.roles ?? [])]);

  if (!roles.has("EMPLOYER") && !roles.has("SUPER_ADMIN")) {
    throw forbidden("Employer access is required.");
  }

  await connectMongo();
  const employerUser = await UserModel.findById(actor.id)
    .select("name email phone phoneNumber metadata")
    .lean();
  const employerApplication = await EmployerApplicationModel.findOne({
    $or: [{ employerUserId: actor.id }, { email: actor.email }],
  })
    .sort({ updatedAt: -1 })
    .lean();
  const company = mergeEmployerCompany(
    employerApplication as LeanRecord | null,
    employerUser as LeanRecord | null,
  );

  const universities = (
    await UniversityModel.find({
      status: "ACTIVE",
      ...deletedFilter,
    })
      .select("_id name shortName slug settings")
      .lean()
  ).filter((university) => universityAllowsEmployers(university as LeanRecord));

  const universityIds = universities.map((university) => String(university._id));
  const universityById = new Map(
    universities.map((university) => [
      String(university._id),
      stringValue(university.name, "Unknown university"),
    ]),
  );

  const [
    departments,
    colleges,
    users,
    projects,
    opportunities,
    applicationsCount,
    savedCandidatesCount,
  ] = await Promise.all([
    DepartmentModel.find({
      universityId: { $in: universityIds },
      status: "ACTIVE",
      ...deletedFilter,
    })
      .select("_id name code collegeId universityId")
      .lean(),
    CollegeModel.find({
      universityId: { $in: universityIds },
      status: "ACTIVE",
      ...deletedFilter,
    })
      .select("_id name shortName code universityId")
      .lean(),
    UserModel.find({
      universityId: { $in: universityIds },
      status: "ACTIVE",
      deletedAt: null,
      $or: [{ role: { $in: ["STUDENT", "ALUMNI"] } }, { roles: { $in: ["STUDENT", "ALUMNI"] } }],
    })
      .select(
        "_id name firstName lastName email phone phoneNumber universityId collegeId departmentId bio skills avatar image profilePhoto profileCompletionPercentage expectedGraduationYear xp role roles createdAt",
      )
      .limit(80)
      .lean(),
    ProjectModel.find({
      universityId: { $in: universityIds },
      status: "PUBLISHED",
      deletedAt: null,
      visibility: { $in: ["PUBLIC", "UNIVERSITY"] },
    })
      .sort({ featured: -1, viewCount: -1, starCount: -1, createdAt: -1 })
      .limit(80)
      .lean(),
    OpportunityModel.find({
      universityId: { $in: universityIds },
      deletedAt: null,
      status: { $in: ["PENDING_APPROVAL", "PUBLISHED", "CLOSED"] },
    })
      .select("_id createdAt status")
      .lean(),
    ApplicationModel.countDocuments({
      employerId: actor.id,
      deletedAt: null,
    }),
    SavedCandidateModel.countDocuments({
      savedById: actor.id,
      status: "ACTIVE",
    }),
  ]);

  const departmentById = new Map(
    departments.map((department) => [
      String(department._id),
      stringValue(department.name, stringValue(department.code, "Not set")),
    ]),
  );
  const collegeById = new Map(
    colleges.map((college) => [
      String(college._id),
      stringValue(
        college.name,
        stringValue(college.shortName, stringValue(college.code, "Not set")),
      ),
    ]),
  );
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const userIds = users.map((user) => String(user._id));
  const [careerProfiles, xpProfiles, activeSavedCandidates] = await Promise.all([
    CareerProfileModel.find({
      universityId: { $in: universityIds },
      userId: { $in: userIds },
      ...deletedFilter,
    })
      .select(
        "userId headline bio skills graduationYear availabilityStatus profileStrength preferredWorkType preferredIndustries",
      )
      .lean(),
    UserXpProfileModel.find({
      universityId: { $in: universityIds },
      userId: { $in: userIds },
    })
      .select("userId totalXp level rank weeklyXp monthlyXp")
      .lean(),
    SavedCandidateModel.find({
      savedById: actor.id,
      candidateUserId: { $in: userIds },
      status: "ACTIVE",
    })
      .select("candidateUserId")
      .lean(),
  ]);
  const careerProfileByUserId = new Map(
    careerProfiles.map((profile) => [String(profile.userId), profile]),
  );
  const xpProfileByUserId = new Map(
    xpProfiles.map((profile) => [String(profile.userId), profile]),
  );
  const activeSavedCandidateIds = new Set(
    activeSavedCandidates.map((item) => String(item.candidateUserId)),
  );
  const projectIds = projects.map((project) => String(project._id));
  const projectDocuments = await ProjectDocumentModel.find({
    projectId: { $in: projectIds },
    status: "ACTIVE",
    deletedAt: null,
  })
    .select("projectId title fileType")
    .lean();

  const documentsByProject = new Map<string, string[]>();
  for (const document of projectDocuments) {
    const projectId = String(document.projectId);
    const existing = documentsByProject.get(projectId) ?? [];
    existing.push(stringValue(document.title, stringValue(document.fileType, "Document")));
    documentsByProject.set(projectId, existing);
  }

  const students = users.map((user) => {
    const careerProfile = careerProfileByUserId.get(String(user._id));
    const xpProfile = xpProfileByUserId.get(String(user._id));
    const name =
      stringValue(user.name, "") ||
      `${stringValue(user.firstName, "").trim()} ${stringValue(user.lastName, "").trim()}`.trim() ||
      stringValue(user.email, "CampusHub user");
    const projectCount = projects.filter(
      (project) => String(project.ownerId) === String(user._id),
    ).length;

    return {
      id: String(user._id),
      name,
      photo:
        stringValue(user.profilePhoto, "") ||
        stringValue(user.avatar, "") ||
        stringValue(user.image, "") ||
        initials(name) ||
        "CH",
      email: stringValue(user.email, ""),
      phone: stringValue(user.phone, stringValue(user.phoneNumber, "")),
      university: universityById.get(String(user.universityId)) ?? "Not set",
      college: collegeById.get(String(user.collegeId)) ?? "Not set",
      department: departmentById.get(String(user.departmentId)) ?? "Not set",
      skills: Array.from(
        new Set([
          ...(Array.isArray(user.skills)
            ? user.skills.map(String).filter(Boolean)
            : []),
          ...(Array.isArray(careerProfile?.skills)
            ? careerProfile.skills.map(String).filter(Boolean)
            : []),
        ]),
      ),
      badges: [],
      saved: activeSavedCandidateIds.has(String(user._id)),
      xp: numberValue(xpProfile?.totalXp, numberValue(user.xp)),
      shortlist: null,
      availability:
        stringValue(careerProfile?.availabilityStatus, "") === "NOT_AVAILABLE"
          ? "Not available"
          : "Available",
      graduationYear: careerProfile?.graduationYear
        ? String(careerProfile.graduationYear)
        : user.expectedGraduationYear
          ? String(user.expectedGraduationYear)
          : "Not set",
      bio: stringValue(careerProfile?.bio, stringValue(user.bio, "No bio added yet.")),
      projects: projectCount,
      profileCompletion: numberValue(
        careerProfile?.profileStrength,
        numberValue(user.profileCompletionPercentage),
      ),
      activity: projectCount
        ? `${projectCount} published project${projectCount === 1 ? "" : "s"}`
        : "No published projects yet",
      tags: Array.isArray(careerProfile?.preferredWorkType)
        ? careerProfile.preferredWorkType.map(String).filter(Boolean)
        : [],
      notes: "",
    };
  });

  const serializedProjects = projects.map((project) => {
    const owner = userById.get(String(project.ownerId));
    const ownerName = owner
      ? stringValue(
          owner.name,
          `${stringValue(owner.firstName, "").trim()} ${stringValue(owner.lastName, "").trim()}`.trim(),
        )
      : "Unknown creator";
    const cover =
      stringValue(project.coverImage, "") ||
      stringValue(project.coverImageUrl, "") ||
      "/logo.png";
    const documents = documentsByProject.get(String(project._id)) ?? [];
    const projectType = project.featured
      ? "Featured Innovation"
      : stringValue(project.category, "Project");

    return {
      id: String(project._id),
      ownerId: String(project.ownerId),
      name: stringValue(project.title, "Untitled project"),
      owner: ownerName,
      university: universityById.get(String(project.universityId)) ?? "Not set",
      department: departmentById.get(String(project.departmentId)) ?? "Not set",
      category: stringValue(project.category, "General"),
      projectType,
      summary: stringValue(project.summary, stringValue(project.shortDescription, "")),
      image: cover,
      galleryImages: [cover, cover, cover],
      views: numberValue(project.viewCount),
      stars: numberValue(project.starCount),
      documents,
      links: [
        stringValue(project.repositoryUrl, ""),
        stringValue(project.demoUrl, ""),
        stringValue(project.projectUrl, ""),
      ].filter(Boolean),
      team: [ownerName],
      gallery: [],
      achievements: project.featured ? ["Featured"] : [],
      analytics: {
        uniqueVisitors: numberValue(project.viewCount),
        githubClicks: 0,
        videoClicks: 0,
        linkClicks: 0,
      },
    };
  });

  const stats = [
    {
      label: "Visible Universities",
      value: formatCompactNumber(universities.length),
      trend: "live",
    },
    {
      label: "Talent Profiles",
      value: formatCompactNumber(students.length),
      trend: "live",
    },
    {
      label: "Published Projects",
      value: formatCompactNumber(serializedProjects.length),
      trend: "live",
    },
    {
      label: "Project Stars",
      value: formatCompactNumber(
        serializedProjects.reduce((sum, project) => sum + project.stars, 0),
      ),
      trend: "live",
    },
    {
      label: "Project Views",
      value: formatCompactNumber(
        serializedProjects.reduce((sum, project) => sum + project.views, 0),
      ),
      trend: "live",
    },
    {
      label: "Opportunities",
      value: formatCompactNumber(opportunities.length),
      trend: "live",
    },
    {
      label: "Applications",
      value: formatCompactNumber(applicationsCount),
      trend: "live",
    },
  ];

  const topUniversities = topCounts(
    [
      ...users
        .map((user) => stringId(user.universityId))
        .filter((value): value is string => Boolean(value)),
      ...projects
        .map((project) => stringId(project.universityId))
        .filter((value): value is string => Boolean(value)),
    ],
    universityById,
    "Unknown university",
  );
  const topDepartments = topCounts(
    [
      ...users
        .map((user) => stringId(user.departmentId))
        .filter((value): value is string => Boolean(value)),
      ...projects
        .map((project) => stringId(project.departmentId))
        .filter((value): value is string => Boolean(value)),
    ],
    departmentById,
    "Unknown department",
  );
  const skillCounts = new Map<string, number>();

  for (const student of students) {
    for (const skill of student.skills) {
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }

  const topSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return {
    company,
    stats,
    students,
    projects: serializedProjects,
    dashboard: {
      topUniversities,
      topDepartments,
      topSkills,
      topTalent: students
        .slice()
        .sort((a, b) => b.xp - a.xp || b.projects - a.projects)
        .slice(0, 5),
      trendingProjects: serializedProjects
        .slice()
        .sort((a, b) => b.views - a.views || b.stars - a.stars)
        .slice(0, 5),
      recentProjects: serializedProjects.slice(0, 5),
      opportunitySummary: {
        total: opportunities.length,
        published: opportunities.filter((item) => item.status === "PUBLISHED").length,
        pending: opportunities.filter((item) => item.status === "PENDING_APPROVAL").length,
        closed: opportunities.filter((item) => item.status === "CLOSED").length,
      },
    },
    universities: universities.map((university) => ({
      id: String(university._id),
      name: stringValue(university.name),
      shortName: stringValue(university.shortName, ""),
      slug: stringValue(university.slug, ""),
    })),
    chartData: buildEmployerTrendData({
      users: users as LeanRecord[],
      projects: projects as LeanRecord[],
      opportunities: opportunities as LeanRecord[],
    }),
    savedCandidatesCount,
    applicationsCount,
  };
}

export async function updateEmployerCompanyProfile(input: unknown) {
  const actor = await requireAuth();
  const roles = new Set([actor.role, ...(actor.roles ?? [])]);

  if (!roles.has("EMPLOYER") && !roles.has("SUPER_ADMIN")) {
    throw forbidden("Employer access is required.");
  }

  const payload = employerCompanySchema.parse(input);
  await connectMongo();

  const existingUser = await UserModel.findById(actor.id)
    .select("name email phone phoneNumber metadata")
    .lean();

  if (!existingUser) {
    throw new Error("Employer profile not found.");
  }

  const before = getEmployerOverrides(existingUser as LeanRecord);
  const existingMetadata = metadataObject(existingUser.metadata);
  const employerCompany = {
    companyName: payload.companyName,
    industry: payload.industry,
    companySize: payload.companySize,
    location: payload.location,
    website: payload.website ?? "",
    contactPerson: payload.contactPerson,
    position: payload.position,
    phone: payload.phone,
    description: payload.description,
    recruitmentInterests: payload.recruitmentInterests ?? [],
  };

  await UserModel.updateOne(
    { _id: actor.id },
    {
      $set: {
        name: payload.contactPerson,
        phone: payload.phone,
        phoneNumber: payload.phone,
        metadata: {
          ...existingMetadata,
          employerCompany,
        },
      },
    },
  );

  await EmployerApplicationModel.updateMany(
    { $or: [{ employerUserId: actor.id }, { email: actor.email }] },
    {
      $set: {
        companyName: payload.companyName,
        industry: payload.industry,
        companySize: payload.companySize,
        website: payload.website ?? null,
        contactPerson: payload.contactPerson,
        position: payload.position,
        phone: payload.phone,
        country: payload.location,
        description: payload.description,
      },
    },
  );

  await writeAuditLog({
    actorId: actor.id,
    universityId: null,
    action: "PROFILE_UPDATE",
    entityType: "employer_profile",
    entityId: actor.id,
    before,
    after: employerCompany,
  });

  return getEmployerPortalSummary();
}
