import { hasRole } from "@/features/authorization/rbac";
import {
  projectLeaderboardQuerySchema,
  type ProjectLeaderboardTimeFilter,
  type ProjectLeaderboardType,
} from "@/features/projects/lib/schemas";
import { serializeProject } from "@/features/projects/lib/project-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { ProjectModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

type LeaderboardMetrics = {
  views: number;
  stars: number;
  clicks: number;
  shares: number;
  score: number;
};

function dayStart(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function timeWindowStart(timeFilter: ProjectLeaderboardTimeFilter) {
  if (timeFilter === "ALL_TIME") return null;

  const date = dayStart();
  if (timeFilter === "TODAY") return date;
  if (timeFilter === "WEEK") date.setDate(date.getDate() - 7);
  if (timeFilter === "MONTH") date.setMonth(date.getMonth() - 1);
  if (timeFilter === "YEAR") date.setFullYear(date.getFullYear() - 1);

  return date;
}

function isSuperAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN"], actor.roles);
}

function isCampusAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles);
}

function requireUniversity(actor: AuthUser) {
  if (!actor.universityId) throw forbidden("University scope is required.");

  return actor.universityId;
}

function scopedProjectMatch(
  actor: AuthUser,
  input: {
    scope: "GLOBAL" | "UNIVERSITY" | "COLLEGE" | "DEPARTMENT";
    universityId?: string;
    collegeId?: string;
    departmentId?: string;
  },
) {
  const match: Record<string, unknown> = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (input.scope === "GLOBAL") {
    if (!isSuperAdmin(actor)) match.visibility = "PUBLIC";

    return match;
  }

  const actorUniversityId = requireUniversity(actor);
  const universityId = input.universityId ?? actorUniversityId;
  if (!isSuperAdmin(actor) && universityId !== actorUniversityId) {
    throw forbidden("Cannot access another university's project leaderboard.");
  }

  match.universityId = universityId;

  if (input.scope === "UNIVERSITY") return match;

  if (input.scope === "COLLEGE") {
    const collegeId = input.collegeId ?? actor.collegeId;
    if (!collegeId) throw forbidden("College scope is required.");
    if (
      !isSuperAdmin(actor) &&
      !isCampusAdmin(actor) &&
      collegeId !== actor.collegeId
    ) {
      throw forbidden("Cannot access another college's project leaderboard.");
    }
    match.collegeId = collegeId;

    return match;
  }

  const departmentId = input.departmentId ?? actor.departmentId;
  if (!departmentId) throw forbidden("Department scope is required.");
  if (
    !isSuperAdmin(actor) &&
    !isCampusAdmin(actor) &&
    departmentId !== actor.departmentId
  ) {
    throw forbidden("Cannot access another department's project leaderboard.");
  }
  match.departmentId = departmentId;

  return match;
}

function metricExpression(
  type: ProjectLeaderboardType,
  allTime: boolean,
): Record<string, unknown> {
  const views = allTime ? "$viewCount" : "$analytics.views";
  const stars = allTime ? "$starCount" : "$analytics.stars";
  const shares = allTime ? "$shareCount" : "$analytics.shares";
  const clicks = {
    $add: [
      "$analytics.linkClicks",
      "$analytics.documentClicks",
      "$analytics.repositoryClicks",
    ],
  };

  if (type === "MOST_VIEWED") return { $ifNull: [views, 0] };
  if (type === "MOST_STARRED") return { $ifNull: [stars, 0] };
  if (type === "MOST_SHARED") return { $ifNull: [shares, 0] };
  if (type === "MOST_CLICKED") return clicks;

  return {
    $add: [
      { $multiply: [{ $ifNull: [views, 0] }, 1] },
      { $multiply: [{ $ifNull: [stars, 0] }, 5] },
      { $multiply: [clicks, 2] },
      { $multiply: [{ $ifNull: [shares, 0] }, 4] },
    ],
  };
}

function sortForLeaderboard(
  type: ProjectLeaderboardType,
): Record<string, 1 | -1> {
  if (type === "NEWEST_RISING") {
    return { score: -1 as const, createdAt: -1 as const };
  }

  return { score: -1 as const, starCount: -1 as const, viewCount: -1 as const };
}

function serializeLeaderboardProject(
  row: Record<string, unknown>,
  index: number,
) {
  const metrics = row.metrics as Partial<LeaderboardMetrics> | undefined;

  return {
    rank: index + 1,
    score: Number(row.score ?? 0),
    metrics: {
      views: Number(metrics?.views ?? 0),
      stars: Number(metrics?.stars ?? 0),
      clicks: Number(metrics?.clicks ?? 0),
      shares: Number(metrics?.shares ?? 0),
      score: Number(row.score ?? 0),
    },
    project: serializeProject(row),
  };
}

export async function getProjectLeaderboard(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = projectLeaderboardQuerySchema.parse(query);
  const since = timeWindowStart(filters.timeFilter);
  const allTime = filters.timeFilter === "ALL_TIME";
  const projectMatch = scopedProjectMatch(actor, filters);
  const analyticsMatch: Record<string, unknown> = {
    $expr: { $eq: ["$projectId", "$$projectId"] },
  };

  if (since) analyticsMatch.date = { $gte: since };

  const metric = metricExpression(filters.type, allTime);
  const rows = await ProjectModel.aggregate([
    { $match: projectMatch },
    {
      $lookup: {
        from: "project_analytics",
        let: { projectId: "$_id" },
        pipeline: [
          { $match: analyticsMatch },
          {
            $group: {
              _id: "$projectId",
              views: { $sum: "$views" },
              stars: { $sum: "$stars" },
              linkClicks: { $sum: "$linkClicks" },
              documentClicks: { $sum: "$documentClicks" },
              repositoryClicks: { $sum: "$repositoryClicks" },
              shares: { $sum: "$shares" },
            },
          },
        ],
        as: "analyticsRows",
      },
    },
    {
      $addFields: {
        analytics: {
          $ifNull: [
            { $first: "$analyticsRows" },
            {
              views: 0,
              stars: 0,
              linkClicks: 0,
              documentClicks: 0,
              repositoryClicks: 0,
              shares: 0,
            },
          ],
        },
      },
    },
    {
      $addFields: {
        metrics: {
          views: { $ifNull: [allTime ? "$viewCount" : "$analytics.views", 0] },
          stars: { $ifNull: [allTime ? "$starCount" : "$analytics.stars", 0] },
          clicks: {
            $add: [
              "$analytics.linkClicks",
              "$analytics.documentClicks",
              "$analytics.repositoryClicks",
            ],
          },
          shares: {
            $ifNull: [allTime ? "$shareCount" : "$analytics.shares", 0],
          },
        },
        score: metric,
      },
    },
    {
      $match:
        filters.type === "NEWEST_RISING" && since
          ? {
              createdAt: { $gte: since },
              score: { $gt: 0 },
            }
          : { score: { $gt: 0 } },
    },
    { $sort: sortForLeaderboard(filters.type) },
    { $limit: filters.limit },
    { $project: { analyticsRows: 0, analytics: 0 } },
  ]);

  return {
    type: filters.type,
    scope: filters.scope,
    timeFilter: filters.timeFilter,
    generatedAt: new Date().toISOString(),
    projects: rows.map((row, index) =>
      serializeLeaderboardProject(row as Record<string, unknown>, index),
    ),
  };
}
