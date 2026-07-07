import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  projectAnalyticsQuerySchema,
  projectEngagementTrackingSchema,
  projectViewTrackingSchema,
} from "@/features/projects/lib/analytics-schemas";
import {
  canManageProjectForActor,
  getVisibleProjectForActor,
  serializeProject,
} from "@/features/projects/lib/project-service";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  ProjectAnalyticsModel,
  ProjectDocumentModel,
  ProjectEngagementModel,
  ProjectModel,
  ProjectViewModel,
} from "@/lib/db/models";

function dayStart(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function daysAgo(days: number) {
  const date = dayStart();
  date.setDate(date.getDate() - days);
  return date;
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

async function incrementDailyAnalytics(input: {
  universityId: string;
  projectId: string;
  increments: Record<string, number>;
}) {
  const date = dayStart();
  const setOnInsert = {
    _id: randomUUID(),
    universityId: input.universityId,
    projectId: input.projectId,
    date,
  };
  const update: Record<string, unknown> = {
    $setOnInsert: setOnInsert,
    $inc: input.increments,
  };

  await ProjectAnalyticsModel.updateOne(
    { projectId: input.projectId, date },
    update,
    { upsert: true },
  );
}

async function assertDashboardAccess(universityId: string | null) {
  const actor = await requireAuth();

  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) return actor;
  if (!actor.universityId) throw forbidden("University scope is required.");
  if (universityId && universityId !== actor.universityId) {
    throw forbidden("Cannot access another university's project analytics.");
  }

  return actor;
}

export async function trackProjectView(projectId: string, input: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = projectViewTrackingSchema.parse(input);
  const project = await getVisibleProjectForActor(projectId, actor);
  const visitorFilter = payload.anonymousId
    ? { anonymousId: payload.anonymousId }
    : { viewerId: actor.id };
  const existingVisitor = await ProjectViewModel.exists({
    projectId,
    ...visitorFilter,
  });

  await ProjectViewModel.create({
    _id: randomUUID(),
    universityId: project.universityId,
    projectId,
    viewerId: payload.anonymousId ? null : actor.id,
    anonymousId: payload.anonymousId ?? null,
    visitorType: "AUTHENTICATED",
    source: payload.source ?? payload.referrer ?? null,
    viewedAt: new Date(),
    metadata: {
      referrer: payload.referrer ?? null,
    },
  });
  await ProjectModel.updateOne({ _id: projectId }, { $inc: { viewCount: 1 } });
  await incrementDailyAnalytics({
    universityId: String(project.universityId),
    projectId,
    increments: {
      views: 1,
      uniqueViews: existingVisitor ? 0 : 1,
    },
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_VIEWED",
    entityType: "project",
    entityId: projectId,
  });

  return { tracked: true };
}

export async function trackProjectEngagement(
  projectId: string,
  engagementType:
    | "LINK_CLICK"
    | "DOCUMENT_CLICK"
    | "REPOSITORY_CLICK"
    | "SHARE",
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = projectEngagementTrackingSchema.parse(input);
  const project = await getVisibleProjectForActor(projectId, actor);

  if (engagementType === "DOCUMENT_CLICK" && !payload.linkId) {
    throw forbidden("Document click tracking requires a link id.");
  }

  if (payload.linkId) {
    const link = await ProjectDocumentModel.findOne({
      _id: payload.linkId,
      projectId,
      status: "ACTIVE",
      deletedAt: null,
    }).lean();
    if (!link) throw notFound("Project link not found.");
  }

  await ProjectEngagementModel.create({
    _id: randomUUID(),
    universityId: project.universityId,
    projectId,
    userId: payload.anonymousId ? null : actor.id,
    anonymousId: payload.anonymousId ?? null,
    engagementType,
    linkId: payload.linkId ?? null,
    url: payload.url ?? null,
    referrer: payload.referrer ?? null,
    occurredAt: new Date(),
  });

  const analyticsIncrements: Record<string, number> = {};
  let auditAction:
    | "PROJECT_LINK_CLICKED"
    | "PROJECT_DOCUMENT_CLICKED"
    | "PROJECT_REPOSITORY_CLICKED"
    | "PROJECT_SHARED" = "PROJECT_LINK_CLICKED";

  if (engagementType === "LINK_CLICK") analyticsIncrements.linkClicks = 1;
  if (engagementType === "DOCUMENT_CLICK") {
    analyticsIncrements.documentClicks = 1;
    analyticsIncrements.documentDownloads = 1;
    auditAction = "PROJECT_DOCUMENT_CLICKED";
    await ProjectDocumentModel.updateOne(
      { _id: payload.linkId },
      { $inc: { downloadCount: 1 } },
    );
  }
  if (engagementType === "REPOSITORY_CLICK") {
    analyticsIncrements.repositoryClicks = 1;
    auditAction = "PROJECT_REPOSITORY_CLICKED";
  }
  if (engagementType === "SHARE") {
    analyticsIncrements.shares = 1;
    auditAction = "PROJECT_SHARED";
    await ProjectModel.updateOne(
      { _id: projectId },
      { $inc: { shareCount: 1 } },
    );
  }

  await incrementDailyAnalytics({
    universityId: String(project.universityId),
    projectId,
    increments: analyticsIncrements,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: auditAction,
    entityType: "project",
    entityId: projectId,
    metadata: {
      linkId: payload.linkId ?? null,
      url: payload.url ?? null,
    },
  });

  return { tracked: true };
}

export async function getProjectAnalytics(
  projectId: string,
  query: unknown = {},
) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = projectAnalyticsQuerySchema.parse(query);
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot access this project's analytics.");
  }
  const since = daysAgo(filters.days);
  const [daily, uniqueVisitors, referrers] = await Promise.all([
    ProjectAnalyticsModel.find({ projectId, date: { $gte: since } })
      .sort({ date: 1 })
      .lean(),
    ProjectViewModel.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: { $ifNull: ["$viewerId", "$anonymousId"] },
        },
      },
      { $count: "count" },
    ]),
    ProjectViewModel.aggregate([
      { $match: { projectId, source: { $ne: null } } },
      { $group: { _id: "$source", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totals = daily.reduce(
    (acc, row) => {
      acc.views += Number(row.views ?? 0);
      acc.linkClicks += Number(row.linkClicks ?? 0);
      acc.documentClicks += Number(row.documentClicks ?? 0);
      acc.repositoryClicks += Number(row.repositoryClicks ?? 0);
      acc.shares += Number(row.shares ?? 0);
      return acc;
    },
    {
      views: 0,
      linkClicks: 0,
      documentClicks: 0,
      repositoryClicks: 0,
      shares: 0,
    },
  );

  return {
    project: serializeProject(project as Record<string, unknown>),
    totals,
    uniqueVisitors: Number(uniqueVisitors[0]?.count ?? 0),
    daily: daily.map((row) => ({
      date: serializeDate(row.date),
      views: Number(row.views ?? 0),
      uniqueViews: Number(row.uniqueViews ?? 0),
      linkClicks: Number(row.linkClicks ?? 0),
      documentClicks: Number(row.documentClicks ?? 0),
      repositoryClicks: Number(row.repositoryClicks ?? 0),
      shares: Number(row.shares ?? 0),
    })),
    topReferrers: referrers.map((row) => ({
      referrer: String(row._id),
      views: Number(row.views ?? 0),
    })),
  };
}

export async function getProjectAnalyticsDashboard(query: unknown = {}) {
  const filters = projectAnalyticsQuerySchema.parse(query);
  const actor = await assertDashboardAccess(filters.universityId ?? null);
  await connectPostgres();
  const universityId = hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)
    ? filters.universityId
    : actor.universityId;
  if (!universityId) throw forbidden("University scope is required.");

  const weeklySince = daysAgo(7);
  const monthlySince = daysAgo(30);
  const [
    totalViews,
    weeklyViews,
    monthlyViews,
    uniqueVisitors,
    topReferrers,
    popularProjects,
  ] = await Promise.all([
    ProjectAnalyticsModel.aggregate([
      { $match: { universityId } },
      { $group: { _id: null, views: { $sum: "$views" } } },
    ]),
    ProjectAnalyticsModel.aggregate([
      { $match: { universityId, date: { $gte: weeklySince } } },
      { $group: { _id: null, views: { $sum: "$views" } } },
    ]),
    ProjectAnalyticsModel.aggregate([
      { $match: { universityId, date: { $gte: monthlySince } } },
      { $group: { _id: null, views: { $sum: "$views" } } },
    ]),
    ProjectViewModel.aggregate([
      { $match: { universityId } },
      {
        $group: {
          _id: { $ifNull: ["$viewerId", "$anonymousId"] },
        },
      },
      { $count: "count" },
    ]),
    ProjectViewModel.aggregate([
      { $match: { universityId, source: { $ne: null } } },
      { $group: { _id: "$source", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: filters.limit },
    ]),
    ProjectModel.find({ universityId, status: "PUBLISHED", deletedAt: null })
      .sort({ viewCount: -1, starCount: -1, shareCount: -1 })
      .limit(filters.limit)
      .lean(),
  ]);

  return {
    totalViews: Number(totalViews[0]?.views ?? 0),
    weeklyViews: Number(weeklyViews[0]?.views ?? 0),
    monthlyViews: Number(monthlyViews[0]?.views ?? 0),
    uniqueVisitors: Number(uniqueVisitors[0]?.count ?? 0),
    topReferrers: topReferrers.map((row) => ({
      referrer: String(row._id),
      views: Number(row.views ?? 0),
    })),
    popularProjects: popularProjects.map((project) =>
      serializeProject(project as Record<string, unknown>),
    ),
  };
}
