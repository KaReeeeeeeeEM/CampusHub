import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  announcementQuerySchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  type AnnouncementVisibility,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "@/features/announcements/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AnnouncementModel,
  AnnouncementViewModel,
  CollegeModel,
  DepartmentModel,
  UserModel,
} from "@/lib/db/models";
import { forbidden, notFound } from "@/lib/api/response";
import { emitNotificationEvent } from "@/lib/notifications/notification-events";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeIds(values?: string[] | null) {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function isCampusAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles);
}

function isRepresentative(actor: AuthUser) {
  return (
    actor.position === "REPRESENTATIVE" ||
    actor.studentLeadershipPositions?.includes("REPRESENTATIVE") ||
    actor.roles?.includes("REPRESENTATIVE")
  );
}

function userRoleVisibility(actor: AuthUser) {
  if (hasRole(actor.role, ["STUDENT"], actor.roles)) return "STUDENTS";
  if (hasRole(actor.role, ["TEACHER"], actor.roles)) return "TEACHERS";
  if (hasRole(actor.role, ["ALUMNI"], actor.roles)) return "ALUMNI";
  if (hasRole(actor.role, ["EMPLOYER"], actor.roles)) return "EMPLOYERS";

  return null;
}

function canCreateAnnouncement(actor: AuthUser) {
  return isCampusAdmin(actor) || isRepresentative(actor);
}

function canManageAllAnnouncements(actor: AuthUser) {
  return isCampusAdmin(actor);
}

function canManageOwnAnnouncement(
  actor: AuthUser,
  announcement: Record<string, unknown>,
) {
  return isRepresentative(actor) && announcement.createdBy === actor.id;
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function serializeAnnouncement(announcement: Record<string, unknown>) {
  return {
    id: String(announcement._id),
    title: String(announcement.title),
    slug: String(announcement.slug),
    content: String(announcement.content ?? announcement.body),
    summary: (announcement.summary as string | null) ?? null,
    category: String(announcement.category),
    priority: String(announcement.priority),
    visibility: String(announcement.visibility),
    universityId: String(announcement.universityId),
    collegeIds: Array.isArray(announcement.collegeIds)
      ? announcement.collegeIds.map(String)
      : [],
    departmentIds: Array.isArray(announcement.departmentIds)
      ? announcement.departmentIds.map(String)
      : [],
    createdBy: String(announcement.createdBy ?? announcement.createdById),
    publishedAt: serializeDate(announcement.publishedAt),
    expiresAt: serializeDate(announcement.expiresAt),
    status: String(announcement.status),
    attachments: Array.isArray(announcement.attachments)
      ? announcement.attachments
      : [],
    analytics: {
      totalViews: Number(announcement.totalViews ?? 0),
      uniqueViews: Number(announcement.uniqueViews ?? 0),
      audienceReach: Number(announcement.audienceReach ?? 0),
      readPercentage: Number(announcement.readPercentage ?? 0),
    },
    deletedAt: serializeDate(announcement.deletedAt),
    createdAt: serializeDate(announcement.createdAt),
    updatedAt: serializeDate(announcement.updatedAt),
  };
}

async function getUniqueSlug(universityId: string, title: string) {
  const baseSlug = slugify(title);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await AnnouncementModel.exists({
      universityId,
      slug,
      ...deletedFilter,
    });

    if (!existing) {
      return slug;
    }
  }

  return `${baseSlug}-${Date.now()}`;
}

async function assertAudienceScope(
  universityId: string,
  collegeIds: string[],
  departmentIds: string[],
) {
  const [colleges, departments] = await Promise.all([
    collegeIds.length
      ? CollegeModel.find({
          _id: { $in: collegeIds },
          universityId,
          ...deletedFilter,
        }).lean()
      : [],
    departmentIds.length
      ? DepartmentModel.find({
          _id: { $in: departmentIds },
          universityId,
          ...deletedFilter,
        }).lean()
      : [],
  ]);

  if (colleges.length !== collegeIds.length) {
    throw forbidden("One or more colleges do not belong to this university.");
  }

  if (departments.length !== departmentIds.length) {
    throw forbidden(
      "One or more departments do not belong to this university.",
    );
  }

  return { colleges, departments };
}

function assertRepresentativeAudience(
  actor: AuthUser,
  visibility: AnnouncementVisibility,
  collegeIds: string[],
  departmentIds: string[],
) {
  if (!isRepresentative(actor) || isCampusAdmin(actor)) {
    return;
  }

  if (!actor.collegeId) {
    throw forbidden("Representative must be assigned to a college.");
  }

  const invalidCollege = collegeIds.some(
    (collegeId) => collegeId !== actor.collegeId,
  );

  if (invalidCollege) {
    throw forbidden("Representatives can only target their assigned college.");
  }

  if (visibility === "SPECIFIC_DEPARTMENTS" && !departmentIds.length) {
    throw forbidden("Representatives must provide department targets.");
  }
}

function getVisiblePublishedFilter(actor: AuthUser) {
  const roleVisibility = userRoleVisibility(actor);
  const visibilityClauses: Record<string, unknown>[] = [
    { visibility: "ALL_USERS" },
  ];

  if (roleVisibility) {
    visibilityClauses.push({ visibility: roleVisibility });
  }

  if (actor.collegeId) {
    visibilityClauses.push({
      visibility: "SPECIFIC_COLLEGES",
      collegeIds: actor.collegeId,
    });
  }

  if (actor.departmentId) {
    visibilityClauses.push({
      visibility: "SPECIFIC_DEPARTMENTS",
      departmentIds: actor.departmentId,
    });
  }

  return {
    universityId: actor.universityId,
    status: "PUBLISHED",
    ...deletedFilter,
    $and: [
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      },
      { $or: visibilityClauses },
    ],
  };
}

function canViewAnnouncement(
  actor: AuthUser,
  announcement: Record<string, unknown>,
) {
  if (canManageAllAnnouncements(actor)) {
    return actor.universityId === announcement.universityId;
  }

  if (canManageOwnAnnouncement(actor, announcement)) {
    return true;
  }

  if (
    announcement.status !== "PUBLISHED" ||
    announcement.deletedAt ||
    actor.universityId !== announcement.universityId
  ) {
    return false;
  }

  const expiresAt = announcement.expiresAt;

  if (expiresAt instanceof Date && expiresAt.getTime() <= Date.now()) {
    return false;
  }

  switch (announcement.visibility) {
    case "ALL_USERS":
      return true;
    case "STUDENTS":
    case "TEACHERS":
    case "ALUMNI":
    case "EMPLOYERS":
      return userRoleVisibility(actor) === announcement.visibility;
    case "SPECIFIC_COLLEGES":
      return (
        Boolean(actor.collegeId) &&
        Array.isArray(announcement.collegeIds) &&
        announcement.collegeIds.includes(actor.collegeId)
      );
    case "SPECIFIC_DEPARTMENTS":
      return (
        Boolean(actor.departmentId) &&
        Array.isArray(announcement.departmentIds) &&
        announcement.departmentIds.includes(actor.departmentId)
      );
    default:
      return false;
  }
}

function audienceUserFilter(announcement: Record<string, unknown>) {
  const base: Record<string, unknown> = {
    universityId: announcement.universityId,
    status: "ACTIVE",
    deletedAt: null,
  };

  switch (announcement.visibility) {
    case "STUDENTS":
      return { ...base, roles: "STUDENT" };
    case "TEACHERS":
      return { ...base, roles: "TEACHER" };
    case "ALUMNI":
      return { ...base, roles: "ALUMNI" };
    case "EMPLOYERS":
      return { ...base, roles: "EMPLOYER" };
    case "SPECIFIC_COLLEGES":
      return {
        ...base,
        collegeId: { $in: announcement.collegeIds ?? [] },
      };
    case "SPECIFIC_DEPARTMENTS":
      return {
        ...base,
        departmentId: { $in: announcement.departmentIds ?? [] },
      };
    case "ALL_USERS":
    default:
      return base;
  }
}

async function recalculateAnalytics(announcementId: string) {
  const announcement = await AnnouncementModel.findById(announcementId).lean();

  if (!announcement) {
    return;
  }

  const [uniqueViews, audienceReach] = await Promise.all([
    AnnouncementViewModel.countDocuments({ announcementId }),
    UserModel.countDocuments(audienceUserFilter(announcement)),
  ]);

  const readPercentage =
    audienceReach > 0
      ? Math.round((uniqueViews / audienceReach) * 10000) / 100
      : 0;

  await AnnouncementModel.updateOne(
    { _id: announcementId },
    {
      $set: {
        uniqueViews,
        audienceReach,
        readPercentage,
      },
    },
  );
}

async function trackAnnouncementView(
  actor: AuthUser,
  announcement: Record<string, unknown>,
) {
  if (announcement.status !== "PUBLISHED") {
    return;
  }

  const viewResult = await AnnouncementViewModel.updateOne(
    {
      announcementId: announcement._id,
      userId: actor.id,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: announcement.universityId,
        announcementId: announcement._id,
        userId: actor.id,
        viewedAt: new Date(),
      },
    },
    { upsert: true },
  );
  await AnnouncementModel.updateOne(
    { _id: announcement._id },
    { $inc: { totalViews: 1 } },
  );

  if (viewResult.upsertedCount) {
    await recalculateAnalytics(String(announcement._id));
  }
}

async function emitAnnouncementNotification(
  type:
    | "ANNOUNCEMENT_PUBLISHED"
    | "ANNOUNCEMENT_UPDATED"
    | "URGENT_ANNOUNCEMENT_CREATED",
  actor: AuthUser,
  announcement: Record<string, unknown>,
) {
  await emitNotificationEvent({
    type,
    universityId: String(announcement.universityId),
    actorId: actor.id,
    entityType: "announcement",
    entityId: String(announcement._id),
    metadata: {
      title: announcement.title,
      priority: announcement.priority,
      visibility: announcement.visibility,
    },
  });
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);

  if (!canCreateAnnouncement(actor)) {
    throw forbidden("You cannot create announcements.");
  }

  await connectPostgres();
  const payload = createAnnouncementSchema.parse(input);
  const collegeIds = normalizeIds(payload.collegeIds);
  const departmentIds = normalizeIds(payload.departmentIds);

  await assertAudienceScope(universityId, collegeIds, departmentIds);
  assertRepresentativeAudience(
    actor,
    payload.visibility,
    collegeIds,
    departmentIds,
  );

  if (payload.status === "PUBLISHED" && !canCreateAnnouncement(actor)) {
    throw forbidden("You cannot publish announcements.");
  }

  const now = new Date();
  const announcement = await AnnouncementModel.create({
    _id: randomUUID(),
    universityId,
    collegeId: collegeIds[0] ?? actor.collegeId ?? null,
    departmentId: departmentIds[0] ?? actor.departmentId ?? null,
    collegeIds,
    departmentIds,
    title: payload.title,
    slug: await getUniqueSlug(universityId, payload.title),
    content: payload.content,
    body: payload.content,
    summary: payload.summary ?? null,
    category: payload.category,
    priority: payload.priority,
    visibility: payload.visibility,
    targetAudience: {
      universityWide: payload.visibility === "ALL_USERS",
      collegeIds,
      departmentIds,
      roles: payload.visibility.endsWith("S") ? [payload.visibility] : [],
    },
    publishedAt:
      payload.status === "PUBLISHED" ? (payload.publishedAt ?? now) : null,
    expiresAt: payload.expiresAt ?? null,
    status: payload.status,
    attachments: payload.attachments,
    createdBy: actor.id,
    createdById: actor.id,
  });

  await recalculateAnalytics(String(announcement._id));
  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ANNOUNCEMENT_CREATED",
    entityType: "announcement",
    entityId: String(announcement._id),
    after: serializeAnnouncement(announcement.toObject()),
  });

  if (payload.priority === "URGENT") {
    await emitAnnouncementNotification(
      "URGENT_ANNOUNCEMENT_CREATED",
      actor,
      announcement.toObject(),
    );
  }

  if (payload.status === "PUBLISHED") {
    await emitAnnouncementNotification(
      "ANNOUNCEMENT_PUBLISHED",
      actor,
      announcement.toObject(),
    );
  }

  return serializeAnnouncement(announcement.toObject());
}

export async function listAnnouncements(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectPostgres();
  const filters = announcementQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = canManageAllAnnouncements(actor)
    ? { universityId, ...deletedFilter }
    : {
        $or: [
          getVisiblePublishedFilter(actor),
          ...(isRepresentative(actor)
            ? [{ universityId, createdBy: actor.id, ...deletedFilter }]
            : []),
        ],
      };

  if (filters.mine) {
    dbFilter.createdBy = actor.id;
  }

  if (filters.status) {
    dbFilter.status = filters.status;
  } else if (!filters.includeArchived) {
    dbFilter.status = { $ne: "ARCHIVED" };
  }

  if (filters.category) dbFilter.category = filters.category;
  if (filters.priority) dbFilter.priority = filters.priority;
  if (filters.from || filters.to) {
    dbFilter.publishedAt = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lte: filters.to } : {}),
    };
  }
  if (filters.q) {
    dbFilter.$text = { $search: filters.q };
  }

  const announcements = await AnnouncementModel.find(dbFilter)
    .sort({ publishedAt: -1, updatedAt: -1 })
    .lean();

  return announcements.map((announcement) =>
    serializeAnnouncement(announcement as Record<string, unknown>),
  );
}

async function getAnnouncementForActor(
  announcementId: string,
  actor: AuthUser,
) {
  const universityId = assertUniversityScope(actor);
  const announcement = await AnnouncementModel.findOne({
    _id: announcementId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!announcement) {
    throw notFound("Announcement not found.");
  }

  if (!canViewAnnouncement(actor, announcement as Record<string, unknown>)) {
    throw forbidden("You cannot access this announcement.");
  }

  return announcement;
}

export async function getAnnouncement(announcementId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const announcement = await getAnnouncementForActor(announcementId, actor);

  await trackAnnouncementView(actor, announcement as Record<string, unknown>);

  const refreshed = await AnnouncementModel.findById(announcementId).lean();

  return serializeAnnouncement(
    (refreshed ?? announcement) as Record<string, unknown>,
  );
}

function assertCanMutate(
  actor: AuthUser,
  announcement: Record<string, unknown>,
) {
  if (
    canManageAllAnnouncements(actor) ||
    canManageOwnAnnouncement(actor, announcement)
  ) {
    return;
  }

  throw forbidden("You cannot modify this announcement.");
}

export async function updateAnnouncement(
  announcementId: string,
  input: UpdateAnnouncementInput,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = updateAnnouncementSchema.parse(input);
  const before = await getAnnouncementForActor(announcementId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const universityId = String(before.universityId);
  const nextCollegeIds = normalizeIds(
    payload.collegeIds ?? (before.collegeIds as string[] | undefined),
  );
  const nextDepartmentIds = normalizeIds(
    payload.departmentIds ?? (before.departmentIds as string[] | undefined),
  );
  const nextVisibility =
    payload.visibility ?? (before.visibility as AnnouncementVisibility);

  await assertAudienceScope(universityId, nextCollegeIds, nextDepartmentIds);
  assertRepresentativeAudience(
    actor,
    nextVisibility,
    nextCollegeIds,
    nextDepartmentIds,
  );

  const update: Record<string, unknown> = {
    updatedById: actor.id,
  };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.content !== undefined) {
    update.content = payload.content;
    update.body = payload.content;
  }
  if (payload.summary !== undefined) update.summary = payload.summary ?? null;
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.priority !== undefined) update.priority = payload.priority;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.collegeIds !== undefined) {
    update.collegeIds = nextCollegeIds;
    update.collegeId = nextCollegeIds[0] ?? null;
  }
  if (payload.departmentIds !== undefined) {
    update.departmentIds = nextDepartmentIds;
    update.departmentId = nextDepartmentIds[0] ?? null;
  }
  if (payload.expiresAt !== undefined)
    update.expiresAt = payload.expiresAt ?? null;
  if (payload.attachments !== undefined)
    update.attachments = payload.attachments;
  if (payload.status !== undefined) {
    update.status = payload.status;
    if (payload.status === "PUBLISHED" && !before.publishedAt) {
      update.publishedAt = payload.publishedAt ?? new Date();
    }
  }

  update.targetAudience = {
    universityWide: nextVisibility === "ALL_USERS",
    collegeIds: nextCollegeIds,
    departmentIds: nextDepartmentIds,
    roles: nextVisibility.endsWith("S") ? [nextVisibility] : [],
  };

  const announcement = await AnnouncementModel.findOneAndUpdate(
    { _id: announcementId, universityId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await recalculateAnalytics(announcementId);
  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "ANNOUNCEMENT_UPDATED",
    entityType: "announcement",
    entityId: announcementId,
    before: serializeAnnouncement(before as Record<string, unknown>),
    after: announcement
      ? serializeAnnouncement(announcement as Record<string, unknown>)
      : null,
  });

  if (announcement) {
    await emitAnnouncementNotification(
      "ANNOUNCEMENT_UPDATED",
      actor,
      announcement as Record<string, unknown>,
    );
  }

  return serializeAnnouncement(announcement as Record<string, unknown>);
}

export async function publishAnnouncement(announcementId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const before = await getAnnouncementForActor(announcementId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const announcement = await AnnouncementModel.findOneAndUpdate(
    { _id: announcementId, universityId: actor.universityId, ...deletedFilter },
    {
      $set: {
        status: "PUBLISHED",
        publishedAt: before.publishedAt ?? new Date(),
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await recalculateAnalytics(announcementId);
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "ANNOUNCEMENT_PUBLISHED",
    entityType: "announcement",
    entityId: announcementId,
    before: serializeAnnouncement(before as Record<string, unknown>),
    after: announcement
      ? serializeAnnouncement(announcement as Record<string, unknown>)
      : null,
  });

  if (announcement) {
    await emitAnnouncementNotification(
      "ANNOUNCEMENT_PUBLISHED",
      actor,
      announcement as Record<string, unknown>,
    );
  }

  return serializeAnnouncement(announcement as Record<string, unknown>);
}

export async function archiveAnnouncement(announcementId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const before = await getAnnouncementForActor(announcementId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const announcement = await AnnouncementModel.findOneAndUpdate(
    { _id: announcementId, universityId: actor.universityId, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "ANNOUNCEMENT_ARCHIVED",
    entityType: "announcement",
    entityId: announcementId,
    before: serializeAnnouncement(before as Record<string, unknown>),
    after: announcement
      ? serializeAnnouncement(announcement as Record<string, unknown>)
      : null,
  });

  return serializeAnnouncement(announcement as Record<string, unknown>);
}

export async function deleteAnnouncement(announcementId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const before = await getAnnouncementForActor(announcementId, actor);

  assertCanMutate(actor, before as Record<string, unknown>);

  const announcement = await AnnouncementModel.findOneAndUpdate(
    { _id: announcementId, universityId: actor.universityId, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(before.universityId),
    action: "ANNOUNCEMENT_DELETED",
    entityType: "announcement",
    entityId: announcementId,
    before: serializeAnnouncement(before as Record<string, unknown>),
    after: announcement
      ? serializeAnnouncement(announcement as Record<string, unknown>)
      : null,
  });

  return serializeAnnouncement(announcement as Record<string, unknown>);
}
