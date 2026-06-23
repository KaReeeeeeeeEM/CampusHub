import type { Model } from "mongoose";

import { requireApiRole } from "@/lib/auth/authorization";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AchievementModel,
  AlumniProfileModel,
  DepartmentModel,
  EmployerApplicationModel,
  LeadershipReportModel,
  MentorProfileModel,
  MentorshipRequestModel,
  MentorshipSessionModel,
  OrderModel,
  OrderRequestModel,
  ProductClickModel,
  ProductModel,
  ProductViewModel,
  ProjectAnalyticsModel,
  ProjectEngagementModel,
  ProjectModel,
  ProjectViewModel,
  ShopModel,
  ShopViewModel,
  StudentModel,
  UniversityModel,
  UserAchievementModel,
  UserModel,
  UserXpProfileModel,
  XpTransactionModel,
} from "@/lib/db/models";
import {
  SuperAdminRecordsExplorer,
  type SuperAdminRecordsExplorerData,
} from "@/features/super-admin/components/super-admin-records-explorer";
import { formatCompactNumber } from "@/lib/number-format";

type RawRecord = Record<string, unknown>;

type SuperAdminMetric = {
  label: string;
  value: string;
  description: string;
};

type SuperAdminPageData = {
  title: string;
  description: string;
  metrics: SuperAdminMetric[];
  table: SuperAdminRecordsExplorerData;
};

type ReferenceMaps = {
  universities: Map<string, string>;
  colleges: Map<string, string>;
  departments: Map<string, string>;
  users: Map<string, string>;
  shops: Map<string, string>;
  projects: Map<string, string>;
  achievements: Map<string, string>;
};

type QueryModel = Model<unknown>;
type SortSpec = Record<string, 1 | -1>;

const pageSlugs = new Set([
  "analytics",
  "departments",
  "students",
  "employers",
  "alumni",
  "leadership-reports",
  "project-analytics",
  "shops",
  "products",
  "marketplace-analytics",
  "mentorship",
  "achievements",
  "xp-leaderboards",
  "integrations",
  "feature-flags",
  "system-health",
]);

export function isSuperAdminConcreteModuleSlug(slug: string) {
  return pageSlugs.has(slug);
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

function text(record: RawRecord, keys: string[], fallback = "Not set") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return formatCompactNumber(value);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value instanceof Date) return formatDate(value);
  }

  return fallback;
}

function number(record: RawRecord, key: string) {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}

function dateText(record: RawRecord, keys: string[], fallback = "Not set") {
  for (const key of keys) {
    const value = record[key];
    if (value instanceof Date) return formatDate(value);
    if (typeof value === "string" && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return formatDate(parsed);
      return value;
    }
  }

  return fallback;
}

function idOf(record: RawRecord) {
  return text(record, ["_id", "id"], crypto.randomUUID());
}

function mapValue(map: Map<string, string>, id: unknown, fallback = "Not set") {
  return typeof id === "string" && id.trim() ? map.get(id) ?? id : fallback;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function metric(label: string, value: number, description: string) {
  return { label, value: formatCompactNumber(value), description };
}

async function count(model: QueryModel, filter: RawRecord = {}) {
  return model.countDocuments(filter);
}

async function rows(
  model: QueryModel,
  filter: RawRecord = {},
  sort: SortSpec = { updatedAt: -1, createdAt: -1 },
  limit = 25,
) {
  const result = await model.find(filter).sort(sort).limit(limit).lean();
  return result.map(asRecord);
}

async function groupCountByUniversity(model: QueryModel, filter: RawRecord = {}) {
  const result = await model.aggregate<{ _id: string | null; count: number }>([
    { $match: filter },
    { $group: { _id: "$universityId", count: { $sum: 1 } } },
  ]);

  return new Map(
    result
      .filter((item) => typeof item._id === "string" && item._id.trim())
      .map((item) => [String(item._id), item.count]),
  );
}

async function groupXpByUniversity() {
  const result = await UserXpProfileModel.aggregate<{
    _id: string | null;
    totalXp: number;
    weeklyXp: number;
  }>([
    {
      $group: {
        _id: "$universityId",
        totalXp: { $sum: "$totalXp" },
        weeklyXp: { $sum: "$weeklyXp" },
      },
    },
  ]);

  return new Map(
    result
      .filter((item) => typeof item._id === "string" && item._id.trim())
      .map((item) => [
        String(item._id),
        { totalXp: item.totalXp, weeklyXp: item.weeklyXp },
      ]),
  );
}

async function loadReferenceMaps(): Promise<ReferenceMaps> {
  const [
    universities,
    colleges,
    departments,
    users,
    shops,
    projects,
    achievements,
  ] = await Promise.all([
    UniversityModel.find({}).select("_id name shortName").lean(),
    import("@/lib/db/models/college").then(({ CollegeModel }) =>
      CollegeModel.find({}).select("_id name shortName code").lean(),
    ),
    DepartmentModel.find({}).select("_id name code").lean(),
    UserModel.find({}).select("_id name email").lean(),
    ShopModel.find({}).select("_id name").lean(),
    ProjectModel.find({}).select("_id title").lean(),
    AchievementModel.find({}).select("_id name").lean(),
  ]);

  return {
    universities: new Map(
      universities.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["shortName", "name"])];
      }),
    ),
    colleges: new Map(
      colleges.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["shortName", "name", "code"])];
      }),
    ),
    departments: new Map(
      departments.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["name", "code"])];
      }),
    ),
    users: new Map(
      users.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["name", "email"])];
      }),
    ),
    shops: new Map(
      shops.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["name"])];
      }),
    ),
    projects: new Map(
      projects.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["title"])];
      }),
    ),
    achievements: new Map(
      achievements.map((item) => {
        const record = asRecord(item);
        return [idOf(record), text(record, ["name"])];
      }),
    ),
  };
}

function renderStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

async function buildAnalyticsPage(): Promise<SuperAdminPageData> {
  const [
    universities,
    studentCounts,
    userCounts,
    departmentCounts,
    projectCounts,
    shopCounts,
    productCounts,
    alumniCounts,
    xpCounts,
  ] = await Promise.all([
    UniversityModel.find({}).sort({ name: 1 }).lean(),
    groupCountByUniversity(StudentModel),
    groupCountByUniversity(UserModel),
    groupCountByUniversity(DepartmentModel),
    groupCountByUniversity(ProjectModel),
    groupCountByUniversity(ShopModel),
    groupCountByUniversity(ProductModel),
    groupCountByUniversity(AlumniProfileModel),
    groupXpByUniversity(),
  ]);
  const competitionRows = universities
    .map((university) => {
      const record = asRecord(university);
      const universityId = idOf(record);
      const students = studentCounts.get(universityId) ?? 0;
      const users = userCounts.get(universityId) ?? 0;
      const departments = departmentCounts.get(universityId) ?? 0;
      const projects = projectCounts.get(universityId) ?? 0;
      const shops = shopCounts.get(universityId) ?? 0;
      const products = productCounts.get(universityId) ?? 0;
      const alumni = alumniCounts.get(universityId) ?? 0;
      const xp = xpCounts.get(universityId) ?? { totalXp: 0, weeklyXp: 0 };
      const score =
        students * 2 +
        users +
        departments * 3 +
        projects * 8 +
        shops * 5 +
        products * 3 +
        alumni * 4 +
        Math.floor(xp.totalXp / 100) +
        Math.floor(xp.weeklyXp / 25);

      return {
        id: universityId,
        name: text(record, ["shortName", "name"]),
        status: renderStatus(text(record, ["status"])),
        score,
        users,
        students,
        departments,
        projects,
        shops,
        products,
        alumni,
        totalXp: xp.totalXp,
        weeklyXp: xp.weeklyXp,
      };
    })
    .sort((first, second) => second.score - first.score || first.name.localeCompare(second.name));
  const activeUniversities = competitionRows.filter((row) => row.score > 0);
  const topUniversity = competitionRows[0];

  return {
    title: "University competition analytics",
    description:
      "Live university standings based on identity, academic structure, marketplace, showcase, alumni, and XP activity.",
    metrics: [
      metric("Universities", competitionRows.length, "Universities in the competition table."),
      metric("Active competitors", activeUniversities.length, "Universities with at least one scoring activity."),
      metric("Top score", topUniversity?.score ?? 0, topUniversity ? topUniversity.name : "No universities yet."),
      metric(
        "Total XP",
        competitionRows.reduce((sum, row) => sum + row.totalXp, 0),
        "XP included in competition scoring.",
      ),
    ],
    table: {
      title: "University competition standings",
      description:
        "Universities are ranked by a weighted activity score from real platform records.",
      columns: [
        { key: "rank", header: "Rank" },
        { key: "university", header: "University" },
        { key: "score", header: "Score" },
        { key: "identity", header: "Identity" },
        { key: "showcase", header: "Showcase" },
        { key: "marketplace", header: "Marketplace" },
        { key: "xp", header: "XP" },
        { key: "status", header: "Status" },
      ],
      rows: competitionRows.map((row, index) => ({
        id: row.id,
        cells: {
          rank: `#${index + 1}`,
          university: row.name,
          score: formatCompactNumber(row.score),
          identity: `${formatCompactNumber(row.users)} users / ${formatCompactNumber(row.students)} students / ${formatCompactNumber(row.alumni)} alumni`,
          showcase: `${formatCompactNumber(row.projects)} projects`,
          marketplace: `${formatCompactNumber(row.shops)} shops / ${formatCompactNumber(row.products)} products`,
          xp: `${formatCompactNumber(row.totalXp)} total / ${formatCompactNumber(row.weeklyXp)} weekly`,
          status: row.status,
        },
      })),
      emptyTitle: "No university competition data yet",
      emptyDescription:
        "University standings will appear once university records exist. Scores update from students, projects, shops, products, alumni, and XP activity.",
    },
  };
}

async function buildDepartmentsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [total, active, inactive, records] = await Promise.all([
    count(DepartmentModel),
    count(DepartmentModel, { status: "ACTIVE" }),
    count(DepartmentModel, { status: "INACTIVE" }),
    rows(DepartmentModel),
  ]);

  return {
    title: "Departments",
    description: "Academic departments across every college and university.",
    metrics: [
      metric("Departments", total, "All department records."),
      metric("Active", active, "Departments currently active."),
      metric("Inactive", inactive, "Departments marked inactive."),
      metric("Universities", refs.universities.size, "Universities available for mapping."),
    ],
    table: {
      title: "Department records",
      description: "Departments are listed with their college and university ownership.",
      columns: [
        { key: "department", header: "Department" },
        { key: "code", header: "Code" },
        { key: "college", header: "College" },
        { key: "university", header: "University" },
        { key: "status", header: "Status" },
        { key: "updatedAt", header: "Updated" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          department: text(record, ["name"]),
          code: text(record, ["code"]),
          college: mapValue(refs.colleges, record.collegeId),
          university: mapValue(refs.universities, record.universityId),
          status: renderStatus(text(record, ["status"])),
          updatedAt: dateText(record, ["updatedAt", "createdAt"]),
        },
      })),
      emptyTitle: "No departments yet",
      emptyDescription:
        "Department records will appear here once universities add their academic structure.",
    },
  };
}

async function buildStudentsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [total, active, pending, records] = await Promise.all([
    count(StudentModel),
    count(StudentModel, { status: "ACTIVE" }),
    count(StudentModel, { status: "PENDING_VERIFICATION" }),
    rows(StudentModel),
  ]);

  return {
    title: "Students",
    description: "Student enrollment records across all universities.",
    metrics: [
      metric("Students", total, "All student records."),
      metric("Active", active, "Active student records."),
      metric("Pending", pending, "Pending verification records."),
      metric("Universities", refs.universities.size, "Universities represented."),
    ],
    table: {
      title: "Student records",
      description: "Students are listed from the student collection, not mock data.",
      columns: [
        { key: "student", header: "Student" },
        { key: "email", header: "Email" },
        { key: "university", header: "University" },
        { key: "college", header: "College" },
        { key: "department", header: "Department" },
        { key: "status", header: "Status" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          student: [text(record, ["firstName"], ""), text(record, ["lastName"], "")]
            .join(" ")
            .trim() || text(record, ["username"]),
          email: text(record, ["email"]),
          university: mapValue(refs.universities, record.universityId),
          college: mapValue(refs.colleges, record.collegeId),
          department: text(record, ["department"]),
          status: renderStatus(text(record, ["status"])),
        },
      })),
      emptyTitle: "No students yet",
      emptyDescription:
        "Student records will appear here once invited students complete enrollment.",
    },
  };
}

async function buildEmployersPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const filter = {
    $or: [{ userType: "EMPLOYER" }, { role: "EMPLOYER" }, { roles: "EMPLOYER" }],
  };
  const [total, active, pendingApplications, records] = await Promise.all([
    count(UserModel, filter),
    count(UserModel, { ...filter, status: "ACTIVE" }),
    count(EmployerApplicationModel, { status: "PENDING" }),
    rows(UserModel, filter),
  ]);

  return {
    title: "Employers",
    description: "Employer accounts and organization access across CampusHub.",
    metrics: [
      metric("Employers", total, "Employer user accounts."),
      metric("Active", active, "Active employer accounts."),
      metric("Pending applications", pendingApplications, "Employer applications awaiting review."),
      metric("Universities", refs.universities.size, "Universities available to employers."),
    ],
    table: {
      title: "Employer accounts",
      description: "Employer accounts are listed from user records with employer roles.",
      columns: [
        { key: "employer", header: "Employer" },
        { key: "email", header: "Email" },
        { key: "university", header: "University" },
        { key: "verified", header: "Verified" },
        { key: "status", header: "Status" },
        { key: "lastLogin", header: "Last login" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          employer: text(record, ["name", "username"]),
          email: text(record, ["email"]),
          university: mapValue(refs.universities, record.universityId),
          verified: text(record, ["isVerified"]),
          status: renderStatus(text(record, ["status"])),
          lastLogin: dateText(record, ["lastLoginAt", "updatedAt"]),
        },
      })),
      emptyTitle: "No employers yet",
      emptyDescription:
        "Employer accounts will appear here once organizations apply or are invited.",
    },
  };
}

async function buildAlumniPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [total, active, publicProfiles, records] = await Promise.all([
    count(AlumniProfileModel),
    count(AlumniProfileModel, { status: "ACTIVE" }),
    count(AlumniProfileModel, { visibility: "PUBLIC" }),
    rows(AlumniProfileModel),
  ]);

  return {
    title: "Alumni",
    description: "Alumni profiles, network participation, and mentorship readiness.",
    metrics: [
      metric("Alumni profiles", total, "All alumni profile records."),
      metric("Active", active, "Active alumni profiles."),
      metric("Public", publicProfiles, "Public alumni profiles."),
      metric("Connections", records.reduce((sum, row) => sum + number(row, "connectionCount"), 0), "Connections on listed profiles."),
    ],
    table: {
      title: "Alumni profiles",
      description: "Alumni are listed with graduation and career information.",
      columns: [
        { key: "alumnus", header: "Alumnus" },
        { key: "university", header: "University" },
        { key: "degree", header: "Degree" },
        { key: "graduationYear", header: "Graduation year" },
        { key: "career", header: "Career" },
        { key: "status", header: "Status" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          alumnus: mapValue(refs.users, record.userId),
          university: mapValue(refs.universities, record.universityId),
          degree: text(record, ["degree"]),
          graduationYear: text(record, ["graduationYear"]),
          career: [text(record, ["currentPosition"], ""), text(record, ["currentCompany"], "")]
            .filter(Boolean)
            .join(" at ") || text(record, ["industry"]),
          status: renderStatus(text(record, ["status"])),
        },
      })),
      emptyTitle: "No alumni yet",
      emptyDescription:
        "Alumni profiles will appear here once graduates activate their profiles.",
    },
  };
}

async function buildLeadershipReportsPage(
  refs: ReferenceMaps,
): Promise<SuperAdminPageData> {
  const [total, submitted, underReview, approved, records] = await Promise.all([
    count(LeadershipReportModel),
    count(LeadershipReportModel, { status: "SUBMITTED" }),
    count(LeadershipReportModel, { status: "UNDER_REVIEW" }),
    count(LeadershipReportModel, { status: "APPROVED" }),
    rows(LeadershipReportModel, {}, { submittedAt: -1, createdAt: -1 }, 50),
  ]);

  return {
    title: "Leadership Reports",
    description:
      "Reports submitted by student leadership and committee members across every university.",
    metrics: [
      metric("Reports", total, "All leadership report records."),
      metric("Submitted", submitted, "Reports awaiting review."),
      metric("Under review", underReview, "Reports currently being reviewed."),
      metric("Approved", approved, "Approved leadership reports."),
    ],
    table: {
      title: "Leadership report records",
      description:
        "Reports are listed with their scope, university, submitter, period, and review status.",
      columns: [
        { key: "report", header: "Report" },
        { key: "university", header: "University" },
        { key: "scope", header: "Scope" },
        { key: "submittedBy", header: "Submitted by" },
        { key: "period", header: "Period" },
        { key: "status", header: "Status" },
        { key: "submittedAt", header: "Submitted" },
      ],
      rows: records.map((record) => {
        const scopeOwner = record.departmentId
          ? mapValue(refs.departments, record.departmentId)
          : record.collegeId
            ? mapValue(refs.colleges, record.collegeId)
            : record.committeeId
              ? "Committee"
              : mapValue(refs.universities, record.universityId);

        return {
          id: idOf(record),
          cells: {
            report: `${text(record, ["title"])} · ${renderStatus(text(record, ["reportType"], "GENERAL"))}`,
            university: mapValue(refs.universities, record.universityId),
            scope: `${renderStatus(text(record, ["scopeType"]))} / ${scopeOwner}`,
            submittedBy: mapValue(
              refs.users,
              record.submittedById ?? record.authorId,
            ),
            period: `${dateText(record, ["reportingPeriodStart"], "Open")} - ${dateText(record, ["reportingPeriodEnd"], "Open")}`,
            status: renderStatus(text(record, ["status"])),
            submittedAt: dateText(record, ["submittedAt", "createdAt"]),
          },
        };
      }),
      emptyTitle: "No leadership reports yet",
      emptyDescription:
        "Leadership reports will appear here once student leaders or committee members submit reports.",
    },
  };
}

async function buildProjectAnalyticsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [rowsTotal, views, engagements, records] = await Promise.all([
    count(ProjectAnalyticsModel),
    count(ProjectViewModel),
    count(ProjectEngagementModel),
    rows(ProjectAnalyticsModel, {}, { date: -1 }),
  ]);

  return {
    title: "Project Analytics",
    description: "Project views, stars, shares, clicks, and engagement snapshots.",
    metrics: [
      metric("Analytics rows", rowsTotal, "Stored project analytics snapshots."),
      metric("Project views", views, "Raw project view events."),
      metric("Engagement events", engagements, "Clicks and shares tracked for projects."),
      metric("Listed views", records.reduce((sum, row) => sum + number(row, "views"), 0), "Views on listed rows."),
    ],
    table: {
      title: "Project analytics rows",
      description: "Analytics snapshots are listed by project, university, and date.",
      columns: [
        { key: "project", header: "Project" },
        { key: "university", header: "University" },
        { key: "date", header: "Date" },
        { key: "views", header: "Views" },
        { key: "stars", header: "Stars" },
        { key: "engagement", header: "Engagement" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          project: mapValue(refs.projects, record.projectId),
          university: mapValue(refs.universities, record.universityId),
          date: dateText(record, ["date"]),
          views: formatCompactNumber(number(record, "views")),
          stars: formatCompactNumber(number(record, "stars")),
          engagement: (
            formatCompactNumber(
              number(record, "linkClicks") +
                number(record, "documentClicks") +
                number(record, "repositoryClicks") +
                number(record, "shares"),
            )
          ),
        },
      })),
      emptyTitle: "No project analytics yet",
      emptyDescription:
        "Project analytics rows will appear here once project activity is tracked.",
    },
  };
}

async function buildShopsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [total, active, verified, records] = await Promise.all([
    count(ShopModel),
    count(ShopModel, { status: "ACTIVE" }),
    count(ShopModel, { verified: true }),
    rows(ShopModel, {}, { updatedAt: -1, viewCount: -1 }),
  ]);

  return {
    title: "Shops",
    description: "Marketplace shops created by campus sellers.",
    metrics: [
      metric("Shops", total, "All shop records."),
      metric("Active", active, "Active marketplace shops."),
      metric("Verified", verified, "Verified shops."),
      metric("Views", records.reduce((sum, row) => sum + number(row, "viewCount"), 0), "Views on listed shops."),
    ],
    table: {
      title: "Shop records",
      description: "Shops are listed with owner, university, activity, and status.",
      columns: [
        { key: "shop", header: "Shop" },
        { key: "university", header: "University" },
        { key: "owner", header: "Owner" },
        { key: "category", header: "Category" },
        { key: "products", header: "Products" },
        { key: "status", header: "Status" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          shop: text(record, ["name"]),
          university: mapValue(refs.universities, record.universityId),
          owner: mapValue(refs.users, record.ownerId),
          category: text(record, ["category"]),
          products: text(record, ["productCount"], "0"),
          status: renderStatus(text(record, ["status"])),
        },
      })),
      emptyTitle: "No shops yet",
      emptyDescription:
        "Shop records will appear here once sellers create marketplace shops.",
    },
  };
}

async function buildProductsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [total, active, services, featured, records] = await Promise.all([
    count(ProductModel),
    count(ProductModel, { status: "ACTIVE" }),
    count(ProductModel, { productType: "SERVICE" }),
    count(ProductModel, { isFeatured: true }),
    rows(ProductModel, {}, { updatedAt: -1, viewCount: -1 }),
  ]);

  return {
    title: "Products",
    description: "Marketplace products and services listed by campus sellers.",
    metrics: [
      metric("Products", total, "All product and service listings."),
      metric("Active", active, "Active listings."),
      metric("Services", services, "Service listings."),
      metric("Featured", featured, "Featured listings."),
    ],
    table: {
      title: "Product records",
      description: "Listings are shown with shop, pricing, activity, and status.",
      columns: [
        { key: "product", header: "Product" },
        { key: "shop", header: "Shop" },
        { key: "university", header: "University" },
        { key: "price", header: "Price" },
        { key: "activity", header: "Activity" },
        { key: "status", header: "Status" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          product: text(record, ["title", "name"]),
          shop: mapValue(refs.shops, record.shopId),
          university: mapValue(refs.universities, record.universityId),
          price: `${text(record, ["currency"], "TZS")} ${number(record, "price").toLocaleString()}`,
          activity: `${formatCompactNumber(number(record, "viewCount"))} views / ${formatCompactNumber(number(record, "favoriteCount"))} favorites`,
          status: renderStatus(text(record, ["status", "availability"])),
        },
      })),
      emptyTitle: "No products yet",
      emptyDescription:
        "Product and service records will appear here once sellers publish listings.",
    },
  };
}

async function buildMarketplaceAnalyticsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [productViews, shopViews, clicks, orders, requests, records] =
    await Promise.all([
      count(ProductViewModel),
      count(ShopViewModel),
      count(ProductClickModel),
      count(OrderModel),
      count(OrderRequestModel),
      rows(ProductModel, {}, { viewCount: -1, clickCount: -1, orderRequestCount: -1 }),
    ]);

  return {
    title: "Marketplace Analytics",
    description: "Marketplace reach, product activity, order requests, and shop performance.",
    metrics: [
      metric("Product views", productViews, "Tracked product views."),
      metric("Shop views", shopViews, "Tracked shop views."),
      metric("Product clicks", clicks, "Tracked listing clicks."),
      metric("Order requests", requests + orders, "Orders and order requests."),
    ],
    table: {
      title: "Top marketplace listings",
      description: "Products are ordered by recorded marketplace activity.",
      columns: [
        { key: "product", header: "Product" },
        { key: "shop", header: "Shop" },
        { key: "university", header: "University" },
        { key: "views", header: "Views" },
        { key: "clicks", header: "Clicks" },
        { key: "requests", header: "Requests" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          product: text(record, ["title", "name"]),
          shop: mapValue(refs.shops, record.shopId),
          university: mapValue(refs.universities, record.universityId),
          views: formatCompactNumber(number(record, "viewCount")),
          clicks: formatCompactNumber(number(record, "clickCount")),
          requests: formatCompactNumber(number(record, "orderRequestCount")),
        },
      })),
      emptyTitle: "No marketplace analytics yet",
      emptyDescription:
        "Marketplace analytics will appear here once shops and products receive activity.",
    },
  };
}

async function buildMentorshipPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [profiles, active, requests, sessions, records] = await Promise.all([
    count(MentorProfileModel),
    count(MentorProfileModel, { status: "ACTIVE" }),
    count(MentorshipRequestModel),
    count(MentorshipSessionModel),
    rows(MentorProfileModel),
  ]);

  return {
    title: "Mentorship",
    description: "Mentor profiles, mentorship requests, sessions, and capacity.",
    metrics: [
      metric("Mentors", profiles, "Mentor profile records."),
      metric("Active", active, "Active mentors."),
      metric("Requests", requests, "Mentorship requests."),
      metric("Sessions", sessions, "Mentorship sessions."),
    ],
    table: {
      title: "Mentor profiles",
      description: "Mentors are listed with capacity, expertise, and university.",
      columns: [
        { key: "mentor", header: "Mentor" },
        { key: "university", header: "University" },
        { key: "expertise", header: "Expertise" },
        { key: "capacity", header: "Capacity" },
        { key: "meetings", header: "Meetings" },
        { key: "status", header: "Status" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          mentor: mapValue(refs.users, record.userId),
          university: mapValue(refs.universities, record.universityId),
          expertise: Array.isArray(record.expertise)
            ? record.expertise.join(", ") || "Not set"
            : "Not set",
          capacity: `${number(record, "currentMentees")}/${number(record, "maxMentees")}`,
          meetings: Array.isArray(record.meetingPreferences)
            ? record.meetingPreferences.join(", ") || "Not set"
            : "Not set",
          status: renderStatus(text(record, ["status"])),
        },
      })),
      emptyTitle: "No mentorship profiles yet",
      emptyDescription:
        "Mentorship profiles will appear here once alumni or staff become mentors.",
    },
  };
}

async function buildAchievementsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [total, active, global, completed, records] = await Promise.all([
    count(AchievementModel),
    count(AchievementModel, { status: "ACTIVE" }),
    count(AchievementModel, { isGlobal: true }),
    count(UserAchievementModel, { status: "COMPLETED" }),
    rows(AchievementModel),
  ]);

  return {
    title: "Achievements",
    description: "Achievement definitions and user completion progress.",
    metrics: [
      metric("Achievements", total, "All achievement definitions."),
      metric("Active", active, "Active achievement definitions."),
      metric("Global", global, "Global achievements."),
      metric("Completed", completed, "Completed user achievements."),
    ],
    table: {
      title: "Achievement definitions",
      description: "Achievement definitions are listed with reward and visibility data.",
      columns: [
        { key: "achievement", header: "Achievement" },
        { key: "university", header: "University" },
        { key: "visibility", header: "Visibility" },
        { key: "xp", header: "XP reward" },
        { key: "global", header: "Global" },
        { key: "status", header: "Status" },
      ],
      rows: records.map((record) => ({
        id: idOf(record),
        cells: {
          achievement: text(record, ["name"]),
          university: mapValue(refs.universities, record.universityId, "Platform-wide"),
          visibility: renderStatus(text(record, ["visibility"])),
          xp: formatCompactNumber(number(record, "xpReward")),
          global: text(record, ["isGlobal"]),
          status: renderStatus(text(record, ["status"])),
        },
      })),
      emptyTitle: "No achievements yet",
      emptyDescription:
        "Achievement definitions will appear here once gamification records are created.",
    },
  };
}

async function buildXpLeaderboardsPage(refs: ReferenceMaps): Promise<SuperAdminPageData> {
  const [profiles, ranked, transactions, awards, records] = await Promise.all([
    count(UserXpProfileModel),
    count(UserXpProfileModel, { rank: { $ne: null } }),
    count(XpTransactionModel),
    count(XpTransactionModel, { transactionType: "AWARD" }),
    rows(UserXpProfileModel, {}, { totalXp: -1, weeklyXp: -1 }),
  ]);

  return {
    title: "XP Leaderboards",
    description: "XP profiles, ranks, levels, and leaderboard activity.",
    metrics: [
      metric("XP profiles", profiles, "User XP profiles."),
      metric("Ranked", ranked, "Profiles with leaderboard ranks."),
      metric("Transactions", transactions, "XP transaction records."),
      metric("Awards", awards, "Award transactions."),
    ],
    table: {
      title: "XP standings",
      description: "Users are listed by total XP, weekly XP, and level.",
      columns: [
        { key: "rank", header: "Rank" },
        { key: "user", header: "User" },
        { key: "university", header: "University" },
        { key: "level", header: "Level" },
        { key: "totalXp", header: "Total XP" },
        { key: "weeklyXp", header: "Weekly XP" },
      ],
      rows: records.map((record, index) => ({
        id: idOf(record),
        cells: {
          rank: text(record, ["rank"], String(index + 1)),
          user: mapValue(refs.users, record.userId),
          university: mapValue(refs.universities, record.universityId),
          level: text(record, ["level"], "1"),
          totalXp: formatCompactNumber(number(record, "totalXp")),
          weeklyXp: formatCompactNumber(number(record, "weeklyXp")),
        },
      })),
      emptyTitle: "No XP profiles yet",
      emptyDescription:
        "XP leaderboard rows will appear here once users start earning XP.",
    },
  };
}

function configured(value: string | undefined) {
  return value && value.trim() ? "Configured" : "Missing";
}

function buildIntegrationsPage(): SuperAdminPageData {
  const integrations = [
    ["MongoDB", "Database", configured(process.env.MONGODB_URI), process.env.MONGODB_DB_NAME ?? "campushub"],
    ["Better Auth", "Authentication", configured(process.env.BETTER_AUTH_SECRET), process.env.BETTER_AUTH_URL ?? "Missing"],
    ["Web Push", "Notifications", configured(process.env.VAPID_PRIVATE_KEY), process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "Public key set" : "Public key missing"],
    ["Acquisition API", "Server secret", configured(process.env.CAMPUSHUB_ACQUISITION_SECRET), "Server-only acquisition flow"],
    ["Super Admin Bootstrap", "Bootstrap", configured(process.env.SUPER_ADMIN_EMAIL), process.env.SUPER_ADMIN_EMAIL ?? "Missing"],
  ];

  return {
    title: "Integrations",
    description: "Runtime integration readiness based on configured services and secrets.",
    metrics: [
      metric("Integrations", integrations.length, "Integration checks listed."),
      metric("Configured", integrations.filter((item) => item[2] === "Configured").length, "Checks with required configuration."),
      metric("Missing", integrations.filter((item) => item[2] === "Missing").length, "Checks missing required configuration."),
      metric("Environment", 1, process.env.APP_ENV ?? process.env.NODE_ENV ?? "development"),
    ],
    table: {
      title: "Integration readiness",
      description: "Each row reflects the current runtime configuration.",
      columns: [
        { key: "integration", header: "Integration" },
        { key: "provider", header: "Provider" },
        { key: "status", header: "Status" },
        { key: "detail", header: "Detail" },
      ],
      rows: integrations.map(([integration, provider, status, detail]) => ({
        id: integration,
        cells: { integration, provider, status, detail },
      })),
      emptyTitle: "No integrations configured yet",
      emptyDescription:
        "Integration readiness rows will appear once integration settings are available.",
    },
  };
}

function buildFeatureFlagsPage(): SuperAdminPageData {
  const flags = Object.entries(process.env)
    .filter(([key]) => /(^FEATURE_|_FEATURE_|^FLAG_|_FLAG$|^ENABLE_|^DISABLE_)/.test(key))
    .map(([key, value]) => [key, value ?? ""]);

  return {
    title: "Feature Flags",
    description: "Runtime rollout flags discovered from environment configuration.",
    metrics: [
      metric("Flags", flags.length, "Runtime feature flags found."),
      metric("Enabled", flags.filter(([, value]) => ["1", "true", "enabled", "on"].includes(value.toLowerCase())).length, "Flags with enabled values."),
      metric("Disabled", flags.filter(([, value]) => ["0", "false", "disabled", "off"].includes(value.toLowerCase())).length, "Flags with disabled values."),
      metric("Other", flags.filter(([, value]) => !["1", "true", "enabled", "on", "0", "false", "disabled", "off"].includes(value.toLowerCase())).length, "Flags with custom values."),
    ],
    table: {
      title: "Feature flag records",
      description: "Flags are read from runtime environment variables.",
      columns: [
        { key: "flag", header: "Flag" },
        { key: "value", header: "Value" },
        { key: "state", header: "State" },
        { key: "source", header: "Source" },
      ],
      rows: flags.map(([key, value]) => ({
        id: key,
        cells: {
          flag: key,
          value: value ? "Set" : "Empty",
          state: ["1", "true", "enabled", "on"].includes(value.toLowerCase())
            ? "Enabled"
            : ["0", "false", "disabled", "off"].includes(value.toLowerCase())
              ? "Disabled"
              : "Custom",
          source: "Runtime environment",
        },
      })),
      emptyTitle: "No feature flags configured",
      emptyDescription:
        "Feature flag rows will appear here when FEATURE_, FLAG_, ENABLE_, or DISABLE_ environment variables are configured.",
    },
  };
}

function buildSystemHealthPage(): SuperAdminPageData {
  const checks = [
    ["Application", "Runtime", process.env.NODE_ENV ?? "development", "Running"],
    ["Environment", "Deployment", process.env.APP_ENV ?? "development", "Running"],
    ["MongoDB", "Database", process.env.MONGODB_URI ? "Configured" : "Missing", process.env.MONGODB_DB_NAME ?? "campushub"],
    ["Better Auth", "Authentication", process.env.BETTER_AUTH_URL ? "Configured" : "Missing", process.env.BETTER_AUTH_URL ?? "Missing"],
    ["Public app URL", "Routing", process.env.NEXT_PUBLIC_APP_URL ? "Configured" : "Missing", process.env.NEXT_PUBLIC_APP_URL ?? "Missing"],
    ["Push notifications", "PWA", process.env.VAPID_PRIVATE_KEY ? "Configured" : "Missing", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "Public key set" : "Public key missing"],
  ];

  return {
    title: "System Health",
    description: "Operational readiness checks for core CampusHub services.",
    metrics: [
      metric("Checks", checks.length, "Operational checks listed."),
      metric("Passing", checks.filter((item) => item[3] === "Running" || item[2] === "Configured").length, "Checks currently configured or running."),
      metric("Attention", checks.filter((item) => item[2] === "Missing").length, "Checks that need configuration."),
      metric("Environment", 1, process.env.APP_ENV ?? process.env.NODE_ENV ?? "development"),
    ],
    table: {
      title: "Health checks",
      description: "Health rows are generated from current runtime configuration.",
      columns: [
        { key: "service", header: "Service" },
        { key: "component", header: "Component" },
        { key: "status", header: "Status" },
        { key: "detail", header: "Detail" },
      ],
      rows: checks.map(([service, component, status, detail]) => ({
        id: service,
        cells: { service, component, status, detail },
      })),
      emptyTitle: "No health checks available",
      emptyDescription:
        "System health checks will appear here once runtime configuration is available.",
    },
  };
}

async function getPageData(slug: string): Promise<SuperAdminPageData | null> {
  if (slug === "integrations") return buildIntegrationsPage();
  if (slug === "feature-flags") return buildFeatureFlagsPage();
  if (slug === "system-health") return buildSystemHealthPage();

  await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();
  const refs = await loadReferenceMaps();

  switch (slug) {
    case "analytics":
      return buildAnalyticsPage();
    case "departments":
      return buildDepartmentsPage(refs);
    case "students":
      return buildStudentsPage(refs);
    case "employers":
      return buildEmployersPage(refs);
    case "alumni":
      return buildAlumniPage(refs);
    case "leadership-reports":
      return buildLeadershipReportsPage(refs);
    case "project-analytics":
      return buildProjectAnalyticsPage(refs);
    case "shops":
      return buildShopsPage(refs);
    case "products":
      return buildProductsPage(refs);
    case "marketplace-analytics":
      return buildMarketplaceAnalyticsPage(refs);
    case "mentorship":
      return buildMentorshipPage(refs);
    case "achievements":
      return buildAchievementsPage(refs);
    case "xp-leaderboards":
      return buildXpLeaderboardsPage(refs);
    default:
      return null;
  }
}

function SuperAdminMetrics({ metrics }: { metrics: SuperAdminMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <p className="text-2xl font-semibold text-foreground">{item.value}</p>
          <p className="mt-2 text-sm font-medium text-foreground">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}

export async function SuperAdminConcreteModulePage({
  moduleSlug,
}: {
  moduleSlug: string;
}) {
  const data = await getPageData(moduleSlug);
  if (!data) return null;

  return (
    <section className="mt-8 space-y-6">
      <SuperAdminMetrics metrics={data.metrics} />
      <SuperAdminRecordsExplorer data={data.table} />
    </section>
  );
}
