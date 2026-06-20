import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { innovationAnalyticsQuerySchema } from "@/features/innovation-analytics/lib/innovation-analytics-schemas";
import { serializeProject } from "@/features/projects/lib/project-service";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ProjectAnalyticsModel,
  ProjectEngagementModel,
  ProjectModel,
  ProjectStarModel,
  ProjectViewModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

type CountRow = {
  _id: unknown;
  count: number;
};

function canReadInnovationAnalytics(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE) ||
    hasPermission(actor, PERMISSIONS.PROJECT_MANAGE) ||
    hasPermission(actor, PERMISSIONS.PROJECT_MODERATE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot view another university's innovation analytics.");
  }

  return actor.universityId;
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
}

function addDateFilter(
  filter: Record<string, unknown>,
  field: string,
  from?: Date,
  to?: Date,
) {
  const range = dateRange(from, to);
  if (range) filter[field] = range;

  return filter;
}

function normalizeCounts(rows: CountRow[], key: string) {
  return rows.map((row) => ({
    [key]: String(row._id ?? "UNKNOWN"),
    count: Number(row.count ?? 0),
  }));
}

function sumRow(rows: Array<Record<string, unknown>>, key: string) {
  return Number(rows[0]?.[key] ?? 0);
}

function dayTrendPipeline(match: Record<string, unknown>, dateField: string) {
  return [
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${dateField}`,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];
}

function normalizeTrend(rows: CountRow[]) {
  return rows.map((row) => ({
    date: String(row._id),
    count: Number(row.count ?? 0),
  }));
}

function projectScoreExpression() {
  return {
    $add: [
      { $ifNull: ["$viewCount", 0] },
      { $multiply: [{ $ifNull: ["$starCount", 0] }, 5] },
      { $multiply: [{ $ifNull: ["$shareCount", 0] }, 4] },
    ],
  };
}

function dateLimitedProjectActivityMatch(input: {
  projectIds: string[];
  from?: Date;
  to?: Date;
}) {
  return addDateFilter(
    { projectId: { $in: input.projectIds } },
    "date",
    input.from,
    input.to,
  );
}

async function allTimeProjectCounters(projectMatch: Record<string, unknown>) {
  const rows = await ProjectModel.aggregate([
    { $match: projectMatch },
    {
      $group: {
        _id: null,
        views: { $sum: "$viewCount" },
        stars: { $sum: "$starCount" },
        shares: { $sum: "$shareCount" },
      },
    },
  ]);

  return {
    views: sumRow(rows, "views"),
    stars: sumRow(rows, "stars"),
    shares: sumRow(rows, "shares"),
  };
}

async function dateRangeProjectCounters(input: {
  projectIds: string[];
  from?: Date;
  to?: Date;
}) {
  const analyticsRows = await ProjectAnalyticsModel.aggregate([
    {
      $match: dateLimitedProjectActivityMatch(input),
    },
    {
      $group: {
        _id: null,
        views: { $sum: "$views" },
        stars: { $sum: "$stars" },
        shares: { $sum: "$shares" },
      },
    },
  ]);

  return {
    views: sumRow(analyticsRows, "views"),
    stars: sumRow(analyticsRows, "stars"),
    shares: sumRow(analyticsRows, "shares"),
  };
}

export async function getInnovationAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadInnovationAnalytics(actor)) {
    throw forbidden("Innovation analytics access is required.");
  }

  await connectMongo();
  const filters = innovationAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  if (!universityId) throw forbidden("University scope is required.");

  const projectMatch: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (filters.collegeId) projectMatch.collegeId = filters.collegeId;
  if (filters.departmentId) projectMatch.departmentId = filters.departmentId;

  const createdProjectMatch = addDateFilter(
    { ...projectMatch },
    "createdAt",
    filters.from,
    filters.to,
  );

  const scopedProjects = await ProjectModel.find(projectMatch)
    .select("_id")
    .lean<Array<{ _id: string }>>();
  const projectIds = scopedProjects.map((project) => String(project._id));
  const hasDateFilter = Boolean(filters.from || filters.to);

  const projectIdMatch = { $in: projectIds };
  const viewEventMatch = addDateFilter(
    { universityId, projectId: projectIdMatch },
    "viewedAt",
    filters.from,
    filters.to,
  );
  const starEventMatch = addDateFilter(
    { universityId, projectId: projectIdMatch },
    "createdAt",
    filters.from,
    filters.to,
  );
  const shareEventMatch = addDateFilter(
    { universityId, projectId: projectIdMatch, engagementType: "SHARE" },
    "occurredAt",
    filters.from,
    filters.to,
  );

  const [
    totalProjects,
    projectsCreated,
    publicProjects,
    privateProjects,
    categoryDistribution,
    visibilityDistribution,
    statusDistribution,
    projectCounters,
    projectViews,
    projectStars,
    projectShares,
    topProjects,
    topInnovators,
    topDepartments,
    topColleges,
    projectsCreatedTrend,
    projectActivityTrend,
    viewTrend,
    starTrend,
    shareTrend,
  ] = await Promise.all([
    ProjectModel.countDocuments(projectMatch),
    ProjectModel.countDocuments(createdProjectMatch),
    ProjectModel.countDocuments({
      ...projectMatch,
      visibility: "PUBLIC",
      status: "PUBLISHED",
    }),
    ProjectModel.countDocuments({
      ...projectMatch,
      visibility: "PRIVATE",
    }),
    ProjectModel.aggregate([
      { $match: createdProjectMatch },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 as const, _id: 1 as const } },
      { $limit: filters.limit },
    ]),
    ProjectModel.aggregate([
      { $match: projectMatch },
      { $group: { _id: "$visibility", count: { $sum: 1 } } },
      { $sort: { count: -1 as const, _id: 1 as const } },
    ]),
    ProjectModel.aggregate([
      { $match: projectMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 as const, _id: 1 as const } },
    ]),
    hasDateFilter
      ? dateRangeProjectCounters({
          projectIds,
          from: filters.from,
          to: filters.to,
        })
      : allTimeProjectCounters(projectMatch),
    hasDateFilter
      ? ProjectViewModel.countDocuments(viewEventMatch)
      : Promise.resolve(0),
    hasDateFilter
      ? ProjectStarModel.countDocuments(starEventMatch)
      : Promise.resolve(0),
    hasDateFilter
      ? ProjectEngagementModel.countDocuments(shareEventMatch)
      : Promise.resolve(0),
    ProjectModel.aggregate([
      { $match: projectMatch },
      { $addFields: { innovationScore: projectScoreExpression() } },
      { $sort: { innovationScore: -1 as const, starCount: -1 as const } },
      { $limit: filters.limit },
    ]),
    ProjectModel.aggregate([
      { $match: projectMatch },
      {
        $group: {
          _id: "$ownerId",
          projectCount: { $sum: 1 },
          publicProjects: {
            $sum: { $cond: [{ $eq: ["$visibility", "PUBLIC"] }, 1, 0] },
          },
          views: { $sum: "$viewCount" },
          stars: { $sum: "$starCount" },
          shares: { $sum: "$shareCount" },
        },
      },
      {
        $addFields: {
          innovationScore: {
            $add: [
              "$views",
              { $multiply: ["$stars", 5] },
              { $multiply: ["$shares", 4] },
              { $multiply: ["$projectCount", 10] },
            ],
          },
        },
      },
      { $sort: { innovationScore: -1 as const, projectCount: -1 as const } },
      { $limit: filters.limit },
      {
        $lookup: {
          from: "user",
          localField: "_id",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $addFields: { owner: { $first: "$owner" } } },
    ]),
    ProjectModel.aggregate([
      {
        $match: {
          ...projectMatch,
          departmentId: { $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$departmentId",
          projectCount: { $sum: 1 },
          views: { $sum: "$viewCount" },
          stars: { $sum: "$starCount" },
          shares: { $sum: "$shareCount" },
        },
      },
      {
        $addFields: {
          innovationScore: {
            $add: [
              "$views",
              { $multiply: ["$stars", 5] },
              { $multiply: ["$shares", 4] },
              { $multiply: ["$projectCount", 10] },
            ],
          },
        },
      },
      { $sort: { innovationScore: -1 as const, projectCount: -1 as const } },
      { $limit: filters.limit },
      {
        $lookup: {
          from: "department",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },
      { $addFields: { department: { $first: "$department" } } },
    ]),
    ProjectModel.aggregate([
      {
        $match: {
          ...projectMatch,
          collegeId: { $nin: [null, ""] },
        },
      },
      {
        $group: {
          _id: "$collegeId",
          projectCount: { $sum: 1 },
          views: { $sum: "$viewCount" },
          stars: { $sum: "$starCount" },
          shares: { $sum: "$shareCount" },
        },
      },
      {
        $addFields: {
          innovationScore: {
            $add: [
              "$views",
              { $multiply: ["$stars", 5] },
              { $multiply: ["$shares", 4] },
              { $multiply: ["$projectCount", 10] },
            ],
          },
        },
      },
      { $sort: { innovationScore: -1 as const, projectCount: -1 as const } },
      { $limit: filters.limit },
      {
        $lookup: {
          from: "college",
          localField: "_id",
          foreignField: "_id",
          as: "college",
        },
      },
      { $addFields: { college: { $first: "$college" } } },
    ]),
    ProjectModel.aggregate(dayTrendPipeline(createdProjectMatch, "createdAt")),
    ProjectAnalyticsModel.aggregate([
      {
        $match: dateLimitedProjectActivityMatch({
          projectIds,
          from: filters.from,
          to: filters.to,
        }),
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
            },
          },
          views: { $sum: "$views" },
          stars: { $sum: "$stars" },
          shares: { $sum: "$shares" },
        },
      },
      { $sort: { _id: 1 as const } },
    ]),
    ProjectViewModel.aggregate(dayTrendPipeline(viewEventMatch, "viewedAt")),
    ProjectStarModel.aggregate(dayTrendPipeline(starEventMatch, "createdAt")),
    ProjectEngagementModel.aggregate(
      dayTrendPipeline(shareEventMatch, "occurredAt"),
    ),
  ]);

  const totalViews = hasDateFilter ? projectViews : projectCounters.views;
  const totalStars = hasDateFilter ? projectStars : projectCounters.stars;
  const totalShares = hasDateFilter ? projectShares : projectCounters.shares;

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "INNOVATION_ANALYTICS_VIEWED",
    entityType: "innovation_analytics",
    metadata: { filters },
  });

  return {
    filters: {
      universityId,
      collegeId: filters.collegeId ?? null,
      departmentId: filters.departmentId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
      limit: filters.limit,
    },
    summary: {
      totalProjects,
      projectsCreated,
      projectViews: totalViews,
      projectStars: totalStars,
      projectShares: totalShares,
      publicProjects,
      privateProjects,
      innovationScore:
        totalViews + totalStars * 5 + totalShares * 4 + projectsCreated * 10,
    },
    distributions: {
      projectCategories: normalizeCounts(categoryDistribution, "category"),
      visibility: normalizeCounts(visibilityDistribution, "visibility"),
      status: normalizeCounts(statusDistribution, "status"),
    },
    rankings: {
      topProjects: topProjects.map((project, index) => ({
        rank: index + 1,
        innovationScore: Number(project.innovationScore ?? 0),
        project: serializeProject(project as Record<string, unknown>),
      })),
      topInnovators: topInnovators.map((row, index) => ({
        rank: index + 1,
        userId: String(row._id),
        name: typeof row.owner?.name === "string" ? row.owner.name : null,
        email: typeof row.owner?.email === "string" ? row.owner.email : null,
        projectCount: Number(row.projectCount ?? 0),
        publicProjects: Number(row.publicProjects ?? 0),
        views: Number(row.views ?? 0),
        stars: Number(row.stars ?? 0),
        shares: Number(row.shares ?? 0),
        innovationScore: Number(row.innovationScore ?? 0),
      })),
      topDepartments: topDepartments.map((row, index) => ({
        rank: index + 1,
        departmentId: String(row._id),
        name:
          typeof row.department?.name === "string"
            ? row.department.name
            : null,
        code:
          typeof row.department?.code === "string"
            ? row.department.code
            : null,
        projectCount: Number(row.projectCount ?? 0),
        views: Number(row.views ?? 0),
        stars: Number(row.stars ?? 0),
        shares: Number(row.shares ?? 0),
        innovationScore: Number(row.innovationScore ?? 0),
      })),
      topColleges: topColleges.map((row, index) => ({
        rank: index + 1,
        collegeId: String(row._id),
        name: typeof row.college?.name === "string" ? row.college.name : null,
        code: typeof row.college?.code === "string" ? row.college.code : null,
        projectCount: Number(row.projectCount ?? 0),
        views: Number(row.views ?? 0),
        stars: Number(row.stars ?? 0),
        shares: Number(row.shares ?? 0),
        innovationScore: Number(row.innovationScore ?? 0),
      })),
    },
    trends: {
      projectsCreated: normalizeTrend(projectsCreatedTrend),
      innovationActivity: projectActivityTrend.map((row) => ({
        date: String(row._id),
        views: Number(row.views ?? 0),
        stars: Number(row.stars ?? 0),
        shares: Number(row.shares ?? 0),
        innovationScore:
          Number(row.views ?? 0) +
          Number(row.stars ?? 0) * 5 +
          Number(row.shares ?? 0) * 4,
      })),
      views: normalizeTrend(viewTrend),
      stars: normalizeTrend(starTrend),
      shares: normalizeTrend(shareTrend),
    },
  };
}
