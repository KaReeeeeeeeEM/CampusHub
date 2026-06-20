import type { Model } from "mongoose";

import { connectMongo } from "@/lib/db/mongodb";
import {
  ApplicationModel,
  CollegeModel,
  CommitteeModel,
  CommitteeReportModel,
  CommunityMemberModel,
  CommunityModel,
  DepartmentModel,
  EventAttendanceModel,
  EventModel,
  LeadershipAssignmentModel,
  LeadershipReportModel,
  OpportunityModel,
  OrderRequestModel,
  ProductModel,
  ReportModel,
  ShopModel,
  StudentModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import { requireCampusAdminSession } from "@/features/campus-admin/lib/campus-admin-service";
import { requireSuperAdminSession } from "@/features/super-admin/lib/super-admin-service";

import {
  reportDateRangeOptions,
  type ReportBreakdownPoint,
  type ReportDateRange,
  type ReportDateRangeKey,
  type ReportMetric,
  type ReportSection,
  type ReportTableRow,
  type ReportTrendPoint,
  type ReportsPayload,
} from "./report-types";

type QueryParams = {
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

type CountModel = Pick<
  Model<unknown>,
  "countDocuments" | "aggregate" | "find"
>;

type RangeContext = {
  range: ReportDateRange;
  from: Date;
  to: Date;
};

type MetricDefinition = {
  key: string;
  label: string;
  category: string;
  total: number;
  active?: number;
  inactive?: number;
  newInRange?: number;
  related?: number;
  description?: string;
  trend?: ReportTrendPoint[];
  relatedEntities?: string[];
  metrics?: Record<string, number | string>;
};

const statusActive = { status: "ACTIVE" };
const notDeleted = { deletedAt: null };
const normalizeParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export function resolveReportDateRange(params: QueryParams = {}): RangeContext {
  const requested = normalizeParam(params.range);
  const rangeKey = reportDateRangeOptions.some(
    (option) => option.value === requested,
  )
    ? (requested as ReportDateRangeKey)
    : "last-30-days";

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);

  if (rangeKey === "custom") {
    const from = parseDateValue(normalizeParam(params.from));
    const to = parseDateValue(normalizeParam(params.to));

    if (from && to) {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return buildRange("custom", from, to);
    }
  }

  if (rangeKey === "today") {
    start.setHours(0, 0, 0, 0);
    return buildRange("today", start, end);
  }

  const days =
    rangeKey === "last-7-days"
      ? 7
      : rangeKey === "last-90-days"
        ? 90
        : rangeKey === "last-year"
          ? 365
          : 30;

  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return buildRange(rangeKey === "custom" ? "last-30-days" : rangeKey, start, end);
}

export async function getSuperAdminReports(
  params: QueryParams = {},
): Promise<ReportsPayload> {
  await requireSuperAdminSession();
  await connectMongo();

  const context = resolveReportDateRange(params);
  const scope = {};

  const sections = await Promise.all([
    getUserReports(context, scope),
    getUniversityReports(context, scope),
    getMarketplaceReports(context, scope),
    getEmployabilityReports(context, scope),
    getCommunityReports(context, scope),
    getGovernanceReports(context, scope),
  ]);

  return {
    scope: "platform",
    title: "Platform Reports",
    description: "Platform-wide reporting and analytics.",
    generatedAt: new Date().toISOString(),
    range: context.range,
    sections,
  };
}

export async function getCampusAdminReports(
  params: QueryParams = {},
): Promise<ReportsPayload> {
  const session = await requireCampusAdminSession();
  await connectMongo();

  const context = resolveReportDateRange(params);
  const universityId =
    typeof session.user.universityId === "string"
      ? session.user.universityId
      : null;
  const scope = universityId ? { universityId } : { universityId: "__missing__" };

  const sections = await Promise.all([
    getStudentReports(context, scope),
    getCollegeReports(context, scope),
    getDepartmentReports(context, scope),
    getCommunityReports(context, scope),
    getEventReports(context, scope),
    getMarketplaceReports(context, scope),
    getEmployabilityReports(context, scope),
    getGovernanceReports(context, scope),
  ]);

  return {
    scope: "university",
    title: "University Reports",
    description: "University-specific reporting for campus administration.",
    generatedAt: new Date().toISOString(),
    range: context.range,
    sections,
  };
}

async function getUserReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const userScope = { ...scope, ...notDeleted };
  const totalUsers = await count(UserModel, userScope);
  const activeUsers = await count(UserModel, { ...userScope, status: "ACTIVE" });
  const inactiveUsers = await count(UserModel, {
    ...userScope,
    status: { $ne: "ACTIVE" },
  });
  const newRegistrations = await countInRange(UserModel, userScope, context);
  const roleBreakdown = await breakdownByField(UserModel, userScope, "roles");
  const trend = await trendByDay(UserModel, userScope, context);

  return buildSection({
    key: "user-reports",
    title: "User Reports",
    description: "Registration, role, and account status metrics.",
    metrics: [
      metric("total-users", "Total Users", totalUsers, "All platform users."),
      metric("users-by-role", "Users By Role", sumBreakdown(roleBreakdown), "Users assigned to roles."),
      metric("active-users", "Active Users", activeUsers, "Users with active accounts."),
      metric("inactive-users", "Inactive Users", inactiveUsers, "Users not currently active."),
      metric("new-registrations", "New Registrations", newRegistrations, "Users created in the selected range."),
    ],
    breakdown: roleBreakdown,
    trend,
    rows: [
      row("total-users", "Total Users", "Users", totalUsers, {
        active: activeUsers,
        inactive: inactiveUsers,
        newInRange: newRegistrations,
        related: sumBreakdown(roleBreakdown),
        trend,
        relatedEntities: roleBreakdown.map((item) => item.label),
      }),
    ],
  });
}

async function getUniversityReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const universities = await count(UniversityModel, { ...scope, ...notDeleted });
  const colleges = await count(CollegeModel, { ...scope, ...notDeleted });
  const departments = await count(DepartmentModel, { ...scope, ...notDeleted });
  const students = await countUsersByRole("STUDENT", scope);
  const staff = await count(UserModel, {
    ...scope,
    ...notDeleted,
    roles: { $in: ["SUPER_ADMIN", "CAMPUS_ADMIN", "TEACHER"] },
  });
  const trend = await trendByDay(UniversityModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(UniversityModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "university-reports",
    title: "University Reports",
    description: "Institution, college, department, student, and staff coverage.",
    metrics: [
      metric("universities", "Universities Count", universities, "Universities in the platform."),
      metric("colleges", "Colleges Count", colleges, "Colleges across universities."),
      metric("departments", "Departments Count", departments, "Departments across colleges."),
      metric("students", "Students Count", students, "Users with student role."),
      metric("staff", "Staff Count", staff, "Administrative and academic staff users."),
    ],
    breakdown,
    trend,
    rows: [
      row("universities", "Universities", "Universities", universities, { trend, related: colleges }),
      row("colleges", "Colleges", "University Structure", colleges, { related: departments }),
      row("departments", "Departments", "University Structure", departments, { related: students }),
      row("students", "Students", "People", students),
      row("staff", "Staff", "People", staff),
    ],
  });
}

async function getStudentReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const students = await countUsersByRole("STUDENT", scope);
  const activeStudents = await count(UserModel, {
    ...scope,
    ...notDeleted,
    roles: "STUDENT",
    status: "ACTIVE",
  });
  const inactiveStudents = await count(UserModel, {
    ...scope,
    ...notDeleted,
    roles: "STUDENT",
    status: { $ne: "ACTIVE" },
  });
  const profiles = await count(StudentModel, { ...scope, ...notDeleted });
  const newStudents = await countInRange(
    UserModel,
    { ...scope, ...notDeleted, roles: "STUDENT" },
    context,
  );
  const trend = await trendByDay(
    UserModel,
    { ...scope, ...notDeleted, roles: "STUDENT" },
    context,
  );
  const breakdown = await statusBreakdown(StudentModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "student-reports",
    title: "Student Reports",
    description: "Student accounts, profiles, and activity status.",
    metrics: [
      metric("students", "Students", students, "Student user accounts."),
      metric("student-profiles", "Student Profiles", profiles, "Student profile records."),
      metric("active-students", "Active Students", activeStudents, "Active student accounts."),
      metric("inactive-students", "Inactive Students", inactiveStudents, "Inactive student accounts."),
      metric("new-students", "New Students", newStudents, "Students created in the selected range."),
    ],
    breakdown,
    trend,
    rows: [
      row("students", "Students", "Students", students, {
        active: activeStudents,
        inactive: inactiveStudents,
        newInRange: newStudents,
        related: profiles,
        trend,
      }),
    ],
  });
}

async function getCollegeReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const colleges = await count(CollegeModel, { ...scope, ...notDeleted });
  const active = await count(CollegeModel, { ...scope, ...notDeleted, ...statusActive });
  const departments = await count(DepartmentModel, { ...scope, ...notDeleted });
  const newColleges = await countInRange(CollegeModel, { ...scope, ...notDeleted }, context);
  const trend = await trendByDay(CollegeModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(CollegeModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "college-reports",
    title: "College Reports",
    description: "College counts, status, and department coverage.",
    metrics: [
      metric("colleges", "Colleges", colleges, "University colleges."),
      metric("active-colleges", "Active Colleges", active, "Active college records."),
      metric("departments", "Departments", departments, "Departments under colleges."),
      metric("new-colleges", "New Colleges", newColleges, "Colleges created in the selected range."),
    ],
    breakdown,
    trend,
    rows: [
      row("colleges", "Colleges", "Colleges", colleges, {
        active,
        inactive: Math.max(colleges - active, 0),
        newInRange: newColleges,
        related: departments,
        trend,
      }),
    ],
  });
}

async function getDepartmentReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const departments = await count(DepartmentModel, { ...scope, ...notDeleted });
  const active = await count(DepartmentModel, { ...scope, ...notDeleted, ...statusActive });
  const staff = await count(UserModel, {
    ...scope,
    ...notDeleted,
    roles: { $in: ["TEACHER", "CAMPUS_ADMIN"] },
  });
  const newDepartments = await countInRange(DepartmentModel, { ...scope, ...notDeleted }, context);
  const trend = await trendByDay(DepartmentModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(DepartmentModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "department-reports",
    title: "Department Reports",
    description: "Department coverage and staff assignment metrics.",
    metrics: [
      metric("departments", "Departments", departments, "University departments."),
      metric("active-departments", "Active Departments", active, "Active department records."),
      metric("staff", "Staff", staff, "Teacher and campus admin users."),
      metric("new-departments", "New Departments", newDepartments, "Departments created in range."),
    ],
    breakdown,
    trend,
    rows: [
      row("departments", "Departments", "Departments", departments, {
        active,
        inactive: Math.max(departments - active, 0),
        newInRange: newDepartments,
        related: staff,
        trend,
      }),
    ],
  });
}

async function getMarketplaceReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const shops = await count(ShopModel, { ...scope, ...notDeleted });
  const products = await count(ProductModel, { ...scope, ...notDeleted });
  const services = await count(ProductModel, {
    ...scope,
    ...notDeleted,
    productType: "SERVICE",
  });
  const orderRequests = await count(OrderRequestModel, { ...scope, ...notDeleted });
  const trend = await trendByDay(OrderRequestModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(OrderRequestModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "marketplace-reports",
    title: "Marketplace Reports",
    description: "Campus market shops, listings, services, and order requests.",
    metrics: [
      metric("shops", "Shops", shops, "Marketplace shops."),
      metric("products", "Products", products, "Marketplace products."),
      metric("services", "Services", services, "Service listings."),
      metric("order-requests", "Order Requests", orderRequests, "Buyer order requests."),
    ],
    breakdown,
    trend,
    rows: [
      row("shops", "Shops", "Marketplace", shops),
      row("products", "Products", "Marketplace", products, { related: services }),
      row("services", "Services", "Marketplace", services),
      row("order-requests", "Order Requests", "Marketplace", orderRequests, { trend }),
    ],
  });
}

async function getEmployabilityReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const opportunities = await count(OpportunityModel, { ...scope, ...notDeleted });
  const applications = await count(ApplicationModel, { ...scope, ...notDeleted });
  const employers = await countUsersByRole("EMPLOYER", scope);
  const hires = await count(ApplicationModel, { ...scope, ...notDeleted, status: "HIRED" });
  const trend = await trendByDay(ApplicationModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(ApplicationModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "employability-reports",
    title: "Employability Reports",
    description: "Opportunity, application, employer, and hire metrics.",
    metrics: [
      metric("opportunities", "Opportunities", opportunities, "Posted opportunities."),
      metric("applications", "Applications", applications, "Submitted applications."),
      metric("employers", "Employers", employers, "Users with employer role."),
      metric("hires", "Hires", hires, "Applications marked hired."),
    ],
    breakdown,
    trend,
    rows: [
      row("opportunities", "Opportunities", "Employability", opportunities),
      row("applications", "Applications", "Employability", applications, { active: applications - hires, related: hires, trend }),
      row("employers", "Employers", "Employability", employers),
      row("hires", "Hires", "Employability", hires),
    ],
  });
}

async function getCommunityReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const communities = await count(CommunityModel, { ...scope, ...notDeleted });
  const members = await count(CommunityMemberModel, scope);
  const events = await count(EventModel, { ...scope, ...notDeleted });
  const participation = await count(EventAttendanceModel, scope);
  const trend = await trendByDay(CommunityModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(CommunityModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "community-reports",
    title: "Community Reports",
    description: "Communities, events, membership, and participation.",
    metrics: [
      metric("communities", "Communities", communities, "Campus communities."),
      metric("events", "Events", events, "Community and campus events."),
      metric("participation", "Participation", participation, "Event attendance records."),
      metric("members", "Members", members, "Community memberships."),
    ],
    breakdown,
    trend,
    rows: [
      row("communities", "Communities", "Communities", communities, { related: members, trend }),
      row("events", "Events", "Communities", events, { related: participation }),
      row("participation", "Participation", "Communities", participation),
    ],
  });
}

async function getEventReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const events = await count(EventModel, { ...scope, ...notDeleted });
  const open = await count(EventModel, { ...scope, ...notDeleted, status: "OPEN" });
  const completed = await count(EventModel, { ...scope, ...notDeleted, status: "COMPLETED" });
  const participation = await count(EventAttendanceModel, scope);
  const trend = await trendByDay(EventModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(EventModel, { ...scope, ...notDeleted });

  return buildSection({
    key: "event-reports",
    title: "Event Reports",
    description: "Event lifecycle, attendance, and participation metrics.",
    metrics: [
      metric("events", "Events", events, "University events."),
      metric("open-events", "Open Events", open, "Events open for registration."),
      metric("completed-events", "Completed Events", completed, "Completed events."),
      metric("participation", "Participation", participation, "Attendance records."),
    ],
    breakdown,
    trend,
    rows: [
      row("events", "Events", "Events", events, {
        active: open,
        inactive: completed,
        related: participation,
        trend,
      }),
    ],
  });
}

async function getGovernanceReports(
  context: RangeContext,
  scope: Record<string, unknown>,
) {
  const committees = await count(CommitteeModel, { ...scope, ...notDeleted });
  const leadershipPositions = await count(LeadershipAssignmentModel, {
    ...scope,
    ...notDeleted,
  });
  const leadershipReports = await count(LeadershipReportModel, {
    ...scope,
    ...notDeleted,
  });
  const committeeReports = await count(CommitteeReportModel, {
    ...scope,
    ...notDeleted,
  });
  const moderationReports = await count(ReportModel, scope);
  const reportsSubmitted =
    leadershipReports + committeeReports + moderationReports;
  const trend = await trendByDay(LeadershipReportModel, { ...scope, ...notDeleted }, context);
  const breakdown = await statusBreakdown(LeadershipReportModel, {
    ...scope,
    ...notDeleted,
  });

  return buildSection({
    key: "governance-reports",
    title: "Governance Reports",
    description: "Committee, leadership, and submitted report metrics.",
    metrics: [
      metric("committees", "Committees", committees, "Governance committees."),
      metric("leadership-positions", "Leadership Positions", leadershipPositions, "Leadership assignments."),
      metric("reports-submitted", "Reports Submitted", reportsSubmitted, "Leadership, committee, and moderation reports."),
    ],
    breakdown,
    trend,
    rows: [
      row("committees", "Committees", "Governance", committees),
      row("leadership-positions", "Leadership Positions", "Governance", leadershipPositions),
      row("reports-submitted", "Reports Submitted", "Governance", reportsSubmitted, {
        related: committeeReports,
        trend,
        metrics: {
          "Leadership reports": leadershipReports,
          "Committee reports": committeeReports,
          "Moderation reports": moderationReports,
        },
      }),
    ],
  });
}

function buildRange(
  key: ReportDateRangeKey,
  from: Date,
  to: Date,
): RangeContext {
  const label =
    reportDateRangeOptions.find((option) => option.value === key)?.label ??
    "Last 30 Days";

  return {
    from,
    to,
    range: {
      key,
      label,
      from: toDateInputValue(from),
      to: toDateInputValue(to),
    },
  };
}

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createdInRange(context: RangeContext) {
  return { createdAt: { $gte: context.from, $lte: context.to } };
}

async function count(
  model: CountModel,
  filter: Record<string, unknown> = {},
) {
  return model.countDocuments(filter).exec();
}

function countInRange(
  model: CountModel,
  filter: Record<string, unknown>,
  context: RangeContext,
) {
  return count(model, { ...filter, ...createdInRange(context) });
}

function countUsersByRole(role: string, scope: Record<string, unknown>) {
  return count(UserModel, { ...scope, ...notDeleted, roles: role });
}

async function trendByDay(
  model: CountModel,
  filter: Record<string, unknown>,
  context: RangeContext,
): Promise<ReportTrendPoint[]> {
  const data = await model
    .aggregate([
      { $match: { ...filter, ...createdInRange(context) } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .exec();

  return data.map((item) => ({
    label: String(item._id),
    value: Number(item.value ?? 0),
  }));
}

async function breakdownByField(
  model: CountModel,
  filter: Record<string, unknown>,
  field: string,
): Promise<ReportBreakdownPoint[]> {
  const data = await model
    .aggregate([
      { $match: filter },
      { $unwind: { path: `$${field}`, preserveNullAndEmptyArrays: false } },
      { $group: { _id: `$${field}`, value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ])
    .exec();

  return data.map((item, index) => ({
    label: titleize(String(item._id ?? `Group ${index + 1}`)),
    value: Number(item.value ?? 0),
  }));
}

async function statusBreakdown(
  model: CountModel,
  filter: Record<string, unknown>,
) {
  const data = await model
    .aggregate([
      { $match: filter },
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ])
    .exec();

  return data
    .filter((item) => item._id)
    .map((item) => ({
      label: titleize(String(item._id)),
      value: Number(item.value ?? 0),
    }));
}

function metric(
  key: string,
  label: string,
  value: number,
  description: string,
): ReportMetric {
  return { key, label, value, description };
}

function row(
  id: string,
  label: string,
  category: string,
  total: number,
  options: Partial<Omit<MetricDefinition, "id" | "label" | "category" | "total">> = {},
): ReportTableRow {
  return {
    id,
    label,
    category,
    total,
    active: options.active ?? 0,
    inactive: options.inactive ?? 0,
    newInRange: options.newInRange ?? 0,
    related: options.related ?? 0,
    metrics: {
      Total: total,
      Active: options.active ?? 0,
      Inactive: options.inactive ?? 0,
      "New in range": options.newInRange ?? 0,
      Related: options.related ?? 0,
      ...(options.metrics ?? {}),
    },
    trend: options.trend ?? [],
    relatedEntities: options.relatedEntities ?? [],
  };
}

function buildSection(input: ReportSection): ReportSection {
  return {
    ...input,
    metrics: input.metrics,
    trend: input.trend.filter((item) => item.value > 0),
    breakdown: input.breakdown.filter((item) => item.value > 0),
    rows: input.rows.filter((item) =>
      [item.total, item.active, item.inactive, item.newInRange, item.related].some(
        (value) => value > 0,
      ),
    ),
  };
}

function sumBreakdown(items: ReportBreakdownPoint[]) {
  return items.reduce((total, item) => total + item.value, 0);
}

function titleize(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
