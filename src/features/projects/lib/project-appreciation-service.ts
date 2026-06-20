import { randomUUID } from "node:crypto";

import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import {
  projectAppreciationQuerySchema,
  savedProjectsQuerySchema,
} from "@/features/projects/lib/schemas";
import {
  getVisibleProjectForActor,
  serializeProject,
} from "@/features/projects/lib/project-service";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ProjectAnalyticsModel,
  ProjectFavoriteModel,
  ProjectModel,
  ProjectStarModel,
} from "@/lib/db/models";
import { requireAuth } from "@/lib/auth/session";
import type { AuthUser } from "@/types/auth";

const STAR_MILESTONES = new Set([10, 25, 50, 100, 250, 500, 1000]);

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

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function feedVisibility(value: unknown) {
  if (value === "PUBLIC") return "PUBLIC";
  if (value === "COLLEGE") return "COLLEGE";
  if (value === "DEPARTMENT") return "DEPARTMENT";
  if (value === "PRIVATE") return "PRIVATE";

  return "UNIVERSITY";
}

async function incrementStarAnalytics(universityId: string, projectId: string) {
  const date = dayStart();

  await ProjectAnalyticsModel.updateOne(
    { projectId, date },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId,
        projectId,
        date,
      },
      $inc: { stars: 1 },
    },
    { upsert: true },
  );
}

async function notifyProjectStarred(
  actor: AuthUser,
  project: Record<string, unknown>,
  starCount: number,
) {
  const ownerId = String(project.ownerId);
  const projectId = String(project._id);
  if (ownerId === actor.id) return;

  await createSystemNotification({
    target: { recipientId: ownerId },
    senderId: actor.id,
    type: "PROJECT_STAR",
    title: "Project received a star",
    message: `${actor.name ?? "Someone"} starred ${String(project.title)}.`,
    entityType: "project",
    entityId: projectId,
    actionUrl: `/projects/${projectId}`,
    image: typeof project.coverImage === "string" ? project.coverImage : null,
    priority: "NORMAL",
    metadata: {
      starCount,
      milestone: null,
    },
  });

  if (!STAR_MILESTONES.has(starCount)) return;

  await createSystemNotification({
    target: { recipientId: ownerId },
    senderId: actor.id,
    type: "PROJECT_STAR",
    title: "Project star milestone reached",
    message: `${String(project.title)} reached ${starCount} stars.`,
    entityType: "project",
    entityId: projectId,
    actionUrl: `/projects/${projectId}`,
    image: typeof project.coverImage === "string" ? project.coverImage : null,
    priority: "HIGH",
    metadata: {
      starCount,
      milestone: starCount,
    },
  });
}

async function serializeSavedProject(
  actor: AuthUser,
  item: Record<string, unknown>,
) {
  try {
    const project = await getVisibleProjectForActor(
      String(item.projectId),
      actor,
    );

    return {
      id: String(item._id),
      type: String(item.type),
      createdAt: serializeDate(item.createdAt),
      project: serializeProject(project as Record<string, unknown>),
    };
  } catch {
    return null;
  }
}

export async function starProject(projectId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const project = await getVisibleProjectForActor(projectId, actor);

  try {
    await ProjectStarModel.create({
      _id: `project-star:${projectId}:${actor.id}`,
      universityId: project.universityId,
      projectId,
      userId: actor.id,
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const current = await ProjectModel.findById(projectId).lean();

    return {
      starred: true,
      duplicate: true,
      starCount: Number(current?.starCount ?? project.starCount ?? 0),
    };
  }

  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, deletedAt: null },
    { $inc: { starCount: 1 } },
    { new: true },
  ).lean();
  const starCount = Number(updated?.starCount ?? 0);

  await Promise.all([
    incrementStarAnalytics(String(project.universityId), projectId),
    createActivity({
      actorId: actor.id,
      actorType: actor.role,
      universityId: String(project.universityId),
      collegeId:
        typeof project.collegeId === "string" ? project.collegeId : null,
      departmentId:
        typeof project.departmentId === "string" ? project.departmentId : null,
      activityType: "PROJECT_STARRED",
      title: String(project.title),
      description: `${actor.name ?? "A CampusHub user"} starred this project.`,
      entityType: "project",
      entityId: projectId,
      image: typeof project.coverImage === "string" ? project.coverImage : null,
      visibility: feedVisibility(project.visibility),
      score: 5,
    }),
    notifyProjectStarred(actor, project as Record<string, unknown>, starCount),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(project.universityId),
      action: "PROJECT_STARRED",
      entityType: "project",
      entityId: projectId,
      metadata: { starCount },
    }),
  ]);

  return {
    starred: true,
    duplicate: false,
    starCount,
  };
}

export async function removeProjectStar(projectId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const project = await getVisibleProjectForActor(projectId, actor);
  const result = await ProjectStarModel.deleteOne({
    projectId,
    userId: actor.id,
  });

  if (!result.deletedCount) {
    const current = await ProjectModel.findById(projectId).lean();

    return {
      starred: false,
      removed: false,
      starCount: Number(current?.starCount ?? project.starCount ?? 0),
    };
  }

  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, deletedAt: null },
    { $inc: { starCount: -1 } },
    { new: true },
  ).lean();
  const starCount = Math.max(0, Number(updated?.starCount ?? 0));

  if (Number(updated?.starCount ?? 0) < 0) {
    await ProjectModel.updateOne({ _id: projectId }, { $set: { starCount } });
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_UNSTARRED",
    entityType: "project",
    entityId: projectId,
    metadata: { starCount },
  });

  return {
    starred: false,
    removed: true,
    starCount,
  };
}

async function setProjectCollectionState(
  projectId: string,
  type: "FAVORITE" | "SAVED",
  active: boolean,
) {
  const actor = await requireAuth();
  await connectMongo();
  const project = await getVisibleProjectForActor(projectId, actor);
  const counterField = type === "FAVORITE" ? "favoriteCount" : "savedCount";
  const auditAction = active
    ? type === "FAVORITE"
      ? "PROJECT_FAVORITED"
      : "PROJECT_SAVED"
    : type === "FAVORITE"
      ? "PROJECT_UNFAVORITED"
      : "PROJECT_UNSAVED";

  if (active) {
    try {
      await ProjectFavoriteModel.create({
        _id: `project-${type.toLowerCase()}:${projectId}:${actor.id}`,
        universityId: project.universityId,
        projectId,
        userId: actor.id,
        type,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;

      const current = await ProjectModel.findById(projectId).lean();

      return {
        active: true,
        duplicate: true,
        count: Number(current?.[counterField] ?? project[counterField] ?? 0),
      };
    }
  } else {
    const result = await ProjectFavoriteModel.deleteOne({
      projectId,
      userId: actor.id,
      type,
    });

    if (!result.deletedCount) {
      const current = await ProjectModel.findById(projectId).lean();

      return {
        active: false,
        removed: false,
        count: Number(current?.[counterField] ?? project[counterField] ?? 0),
      };
    }
  }

  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, deletedAt: null },
    { $inc: { [counterField]: active ? 1 : -1 } },
    { new: true },
  ).lean();
  const count = Math.max(0, Number(updated?.[counterField] ?? 0));

  if (Number(updated?.[counterField] ?? 0) < 0) {
    await ProjectModel.updateOne(
      { _id: projectId },
      { $set: { [counterField]: count } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: auditAction,
    entityType: "project",
    entityId: projectId,
    metadata: {
      type,
      count,
    },
  });

  return {
    active,
    removed: !active,
    duplicate: false,
    count,
  };
}

export function favoriteProject(projectId: string) {
  return setProjectCollectionState(projectId, "FAVORITE", true);
}

export function removeProjectFavorite(projectId: string) {
  return setProjectCollectionState(projectId, "FAVORITE", false);
}

export function saveProject(projectId: string) {
  return setProjectCollectionState(projectId, "SAVED", true);
}

export function removeSavedProject(projectId: string) {
  return setProjectCollectionState(projectId, "SAVED", false);
}

export async function getProjectAppreciation(
  projectId: string,
  query: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = projectAppreciationQuerySchema.parse(query);
  const project = await getVisibleProjectForActor(projectId, actor);
  const since = daysAgo(filters.days);

  const [starState, favoriteState, savedState, recentStars, starGrowth] =
    await Promise.all([
      ProjectStarModel.exists({ projectId, userId: actor.id }),
      ProjectFavoriteModel.exists({
        projectId,
        userId: actor.id,
        type: "FAVORITE",
      }),
      ProjectFavoriteModel.exists({
        projectId,
        userId: actor.id,
        type: "SAVED",
      }),
      ProjectStarModel.find({ projectId })
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .lean(),
      ProjectStarModel.aggregate([
        { $match: { projectId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            stars: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  return {
    project: serializeProject(project as Record<string, unknown>),
    isStarred: Boolean(starState),
    isFavorited: Boolean(favoriteState),
    isSaved: Boolean(savedState),
    totalStars: Number(project.starCount ?? 0),
    recentStars: recentStars.map((star) => ({
      id: String(star._id),
      userId: String(star.userId),
      createdAt: serializeDate(star.createdAt),
    })),
    starGrowth: starGrowth.map((row) => ({
      date: String(row._id),
      stars: Number(row.stars ?? 0),
    })),
  };
}

export async function listSavedProjects(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = savedProjectsQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = { userId: actor.id };
  if (filters.type) dbFilter.type = filters.type;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const items = await ProjectFavoriteModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();
  const serialized = await Promise.all(
    items.map((item) =>
      serializeSavedProject(actor, item as Record<string, unknown>),
    ),
  );

  return serialized.filter(Boolean);
}
