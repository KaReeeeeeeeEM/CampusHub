import { randomUUID } from "node:crypto";

import {
  projectLeaderboardQuerySchema,
  publicProjectQuerySchema,
  publicProjectViewTrackingSchema,
  type ProjectLeaderboardTimeFilter,
  type ProjectLeaderboardType,
} from "@/features/projects/lib/schemas";
import { serializeProject } from "@/features/projects/lib/project-service";
import { notFound } from "@/lib/api/response";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ProjectAnalyticsModel,
  ProjectModel,
  ProjectViewModel,
} from "@/lib/db/models";

const publicProjectFilter = {
  visibility: "PUBLIC",
  status: "PUBLISHED",
  deletedAt: null,
} as const;

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

function publicProjectDbFilter(query: unknown = {}) {
  const filters = publicProjectQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = { ...publicProjectFilter };

  if (filters.universityId) dbFilter.universityId = filters.universityId;
  if (filters.category) dbFilter.category = filters.category;
  if (filters.featured !== undefined) dbFilter.featured = filters.featured;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  return { filters, dbFilter };
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
  const metrics = row.metrics as
    | { views?: number; stars?: number; clicks?: number; shares?: number }
    | undefined;

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

async function incrementPublicViewAnalytics(input: {
  universityId: string;
  projectId: string;
  unique: boolean;
}) {
  const date = dayStart();

  await ProjectAnalyticsModel.updateOne(
    { projectId: input.projectId, date },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: input.universityId,
        projectId: input.projectId,
        date,
      },
      $inc: {
        views: 1,
        publicViews: 1,
        uniqueViews: input.unique ? 1 : 0,
        publicUniqueViews: input.unique ? 1 : 0,
      },
    },
    { upsert: true },
  );
}

export async function listPublicProjects(query: unknown = {}) {
  await connectMongo();
  const { filters, dbFilter } = publicProjectDbFilter(query);
  const projects = await ProjectModel.find(dbFilter)
    .sort({ featured: -1, featuredAt: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return projects.map((project) =>
    serializeProject(project as Record<string, unknown>),
  );
}

export async function searchPublicProjects(query: unknown = {}) {
  return listPublicProjects(query);
}

export async function getPublicProject(projectIdOrSlug: string) {
  await connectMongo();
  const project = await ProjectModel.findOne({
    ...publicProjectFilter,
    $or: [{ _id: projectIdOrSlug }, { slug: projectIdOrSlug }],
  }).lean();

  if (!project) throw notFound("Public project not found.");

  return serializeProject(project as Record<string, unknown>);
}

export async function getPublicFeaturedProjects(query: unknown = {}) {
  return listPublicProjects({
    ...publicProjectQuerySchema.parse(query),
    featured: true,
  });
}

export async function getPublicProjectCategories(query: unknown = {}) {
  await connectMongo();
  const filters = publicProjectQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = { ...publicProjectFilter };
  if (filters.universityId) dbFilter.universityId = filters.universityId;

  const categories = await ProjectModel.aggregate([
    { $match: dbFilter },
    {
      $group: {
        _id: "$category",
        projectCount: { $sum: 1 },
        totalViews: { $sum: "$viewCount" },
        totalStars: { $sum: "$starCount" },
      },
    },
    { $sort: { projectCount: -1, _id: 1 } },
  ]);

  return categories.map((category) => ({
    category: String(category._id),
    projectCount: Number(category.projectCount ?? 0),
    totalViews: Number(category.totalViews ?? 0),
    totalStars: Number(category.totalStars ?? 0),
  }));
}

export async function getPublicProjectLeaderboard(query: unknown = {}) {
  await connectMongo();
  const filters = projectLeaderboardQuerySchema.parse({
    ...(typeof query === "object" && query !== null ? query : {}),
    scope: "GLOBAL",
  });
  const since = timeWindowStart(filters.timeFilter);
  const allTime = filters.timeFilter === "ALL_TIME";
  const analyticsMatch: Record<string, unknown> = {
    $expr: { $eq: ["$projectId", "$$projectId"] },
  };

  if (since) analyticsMatch.date = { $gte: since };

  const rows = await ProjectModel.aggregate([
    { $match: publicProjectFilter },
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
        score: metricExpression(filters.type, allTime),
      },
    },
    {
      $match:
        filters.type === "NEWEST_RISING" && since
          ? { createdAt: { $gte: since }, score: { $gt: 0 } }
          : { score: { $gt: 0 } },
    },
    { $sort: sortForLeaderboard(filters.type) },
    { $limit: filters.limit },
    { $project: { analyticsRows: 0, analytics: 0 } },
  ]);

  return {
    type: filters.type,
    scope: "GLOBAL",
    timeFilter: filters.timeFilter,
    generatedAt: new Date().toISOString(),
    projects: rows.map((row, index) =>
      serializeLeaderboardProject(row as Record<string, unknown>, index),
    ),
  };
}

export async function trackPublicProjectView(
  projectIdOrSlug: string,
  input: unknown = {},
) {
  await connectMongo();
  const payload = publicProjectViewTrackingSchema.parse(input);
  const project = await ProjectModel.findOne({
    ...publicProjectFilter,
    $or: [{ _id: projectIdOrSlug }, { slug: projectIdOrSlug }],
  }).lean();
  if (!project) throw notFound("Public project not found.");

  const existingVisitor = payload.anonymousId
    ? await ProjectViewModel.exists({
        projectId: project._id,
        anonymousId: payload.anonymousId,
        visitorType: "PUBLIC",
      })
    : null;

  await ProjectViewModel.create({
    _id: randomUUID(),
    universityId: project.universityId,
    projectId: project._id,
    viewerId: null,
    anonymousId: payload.anonymousId ?? null,
    visitorType: "PUBLIC",
    source: payload.source ?? payload.referrer ?? null,
    viewedAt: new Date(),
    metadata: {
      referrer: payload.referrer ?? null,
      publicVisitor: true,
    },
  });
  await ProjectModel.updateOne(
    { _id: project._id },
    { $inc: { viewCount: 1 } },
  );
  await incrementPublicViewAnalytics({
    universityId: String(project.universityId),
    projectId: String(project._id),
    unique: Boolean(payload.anonymousId && !existingVisitor),
  });

  return { tracked: true };
}
