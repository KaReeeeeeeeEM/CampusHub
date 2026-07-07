import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import { notifySavedCandidateFollowers } from "@/features/career/lib/saved-candidate-activity-notifications";
import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import {
  addProjectLinkSchema,
  addProjectMemberSchema,
  createProjectSchema,
  projectQuerySchema,
  updateProjectSchema,
  updateProjectVisibilitySchema,
} from "@/features/projects/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  ProjectDocumentModel,
  ProjectMemberModel,
  ProjectModel,
  UserModel,
} from "@/lib/db/models";
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

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function canModerateProjects(actor: AuthUser) {
  return hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles);
}

async function uniqueSlug(universityId: string, title: string) {
  const base = slugify(title) || `project-${Date.now()}`;
  let candidate = base;
  let index = 1;

  while (await ProjectModel.exists({ universityId, slug: candidate })) {
    index += 1;
    candidate = `${base}-${index}`;
  }

  return candidate;
}

export function serializeProject(project: Record<string, unknown>) {
  return {
    id: String(project._id),
    universityId: String(project.universityId),
    ownerId: String(project.ownerId),
    title: String(project.title),
    slug: String(project.slug),
    description: String(project.description ?? ""),
    shortDescription: String(project.shortDescription ?? project.summary),
    coverImage:
      typeof project.coverImage === "string"
        ? project.coverImage
        : typeof project.coverImageUrl === "string"
          ? project.coverImageUrl
          : null,
    projectStatus: String(project.projectStatus ?? "IDEA"),
    category: String(project.category),
    techStack: Array.isArray(project.techStack)
      ? project.techStack.map(String)
      : Array.isArray(project.skills)
        ? project.skills.map(String)
        : [],
    projectUrl:
      typeof project.projectUrl === "string"
        ? project.projectUrl
        : typeof project.demoUrl === "string"
          ? project.demoUrl
          : null,
    repositoryUrl:
      typeof project.repositoryUrl === "string" ? project.repositoryUrl : null,
    visibility: String(project.visibility),
    roleVisibility: Array.isArray(project.roleVisibility)
      ? project.roleVisibility.map(String)
      : [],
    featured: Boolean(project.featured ?? project.featuredAt),
    status: String(project.status),
    starCount: Number(project.starCount ?? 0),
    viewCount: Number(project.viewCount ?? 0),
    shareCount: Number(project.shareCount ?? 0),
    favoriteCount: Number(project.favoriteCount ?? 0),
    savedCount: Number(project.savedCount ?? 0),
    documentCount: Number(project.documentCount ?? 0),
    createdAt: serializeDate(project.createdAt),
    updatedAt: serializeDate(project.updatedAt),
  };
}

function serializeMember(member: Record<string, unknown>) {
  return {
    id: String(member._id),
    projectId: String(member.projectId),
    userId: String(member.userId),
    role: String(member.role),
    joinedAt: serializeDate(member.joinedAt),
  };
}

function serializeLink(link: Record<string, unknown>) {
  return {
    id: String(link._id),
    projectId: String(link.projectId),
    title: String(link.title),
    url: String(link.fileUrl),
    type: String(link.fileType),
    description:
      typeof link.metadata === "object" &&
      link.metadata &&
      "description" in link.metadata
        ? String((link.metadata as Record<string, unknown>).description)
        : null,
    createdAt: serializeDate(link.createdAt),
  };
}

function visibilityFilter(actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const filters: Record<string, unknown>[] = [
    { visibility: "PUBLIC", status: "PUBLISHED" },
    { universityId, visibility: "UNIVERSITY", status: "PUBLISHED" },
    { ownerId: actor.id },
    { teamMemberIds: actor.id },
  ];

  if (actor.collegeId) {
    filters.push({
      universityId,
      visibility: "COLLEGE",
      collegeId: actor.collegeId,
      status: "PUBLISHED",
    });
  }
  if (actor.departmentId) {
    filters.push({
      universityId,
      visibility: "DEPARTMENT",
      departmentId: actor.departmentId,
      status: "PUBLISHED",
    });
  }
  filters.push({
    universityId,
    visibility: "CUSTOM_ROLES",
    roleVisibility: { $in: [actor.role, ...(actor.roles ?? [])] },
    status: "PUBLISHED",
  });

  return filters;
}

function feedVisibility(value: unknown) {
  if (value === "PUBLIC") return "PUBLIC";
  if (value === "COLLEGE") return "COLLEGE";
  if (value === "DEPARTMENT") return "DEPARTMENT";
  if (value === "PRIVATE") return "PRIVATE";

  return "UNIVERSITY";
}

export async function getVisibleProjectForActor(
  projectId: string,
  actor: AuthUser,
) {
  const project = await ProjectModel.findOne({
    _id: projectId,
    ...deletedFilter,
    $or: canModerateProjects(actor)
      ? [{ universityId: actor.universityId }, ...visibilityFilter(actor)]
      : visibilityFilter(actor),
  }).lean();

  if (!project) throw notFound("Project not found.");

  return project;
}

export async function canManageProjectForActor(
  actor: AuthUser,
  project: Record<string, unknown>,
) {
  if (canModerateProjects(actor)) return true;
  if (project.ownerId === actor.id) return true;

  return Boolean(
    await ProjectMemberModel.exists({
      projectId: project._id,
      userId: actor.id,
      role: { $in: ["OWNER", "CO_OWNER"] },
    }),
  );
}

export async function createProject(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectPostgres();
  const payload = createProjectSchema.parse(input);
  const project = await ProjectModel.create({
    _id: randomUUID(),
    universityId,
    ownerId: actor.id,
    collegeId: actor.collegeId ?? null,
    departmentId: actor.departmentId ?? null,
    title: payload.title,
    slug: await uniqueSlug(universityId, payload.title),
    summary: payload.shortDescription,
    shortDescription: payload.shortDescription,
    description: payload.description,
    coverImageUrl: payload.coverImage ?? null,
    coverImage: payload.coverImage ?? null,
    projectStatus: payload.projectStatus,
    category: payload.category,
    techStack: payload.techStack,
    skills: payload.techStack,
    tags: [payload.category, ...payload.techStack],
    repositoryUrl: payload.repositoryUrl ?? null,
    demoUrl: payload.projectUrl ?? null,
    projectUrl: payload.projectUrl ?? null,
    visibility: payload.visibility,
    roleVisibility: payload.roleVisibility,
    status: "DRAFT",
    createdById: actor.id,
  });
  await ProjectMemberModel.create({
    _id: randomUUID(),
    universityId,
    projectId: project._id,
    userId: actor.id,
    role: "OWNER",
    joinedAt: new Date(),
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "PROJECT_CREATED",
    entityType: "project",
    entityId: String(project._id),
    after: serializeProject(project.toObject()),
  });
  await notifySavedCandidateFollowers({
    candidateUserId: actor.id,
    universityId,
    type: "PROJECT_CREATED",
    title: `${actor.name ?? "A saved candidate"} created a project`,
    message: `${actor.name ?? "A saved candidate"} created "${payload.title}".`,
    entityType: "project",
    entityId: String(project._id),
    actionUrl: `/employer/candidates/${actor.id}`,
    metadata: {
      projectTitle: payload.title,
      projectStatus: "DRAFT",
    },
  });

  return serializeProject(project.toObject());
}

export async function listProjects(query: unknown = {}) {
  const actor = await requireAuth();
  await connectPostgres();
  const filters = projectQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    ...deletedFilter,
    $or: visibilityFilter(actor),
  };

  if (filters.universityId) {
    if (
      !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
      filters.universityId !== actor.universityId
    ) {
      throw forbidden("Cannot access another university's projects.");
    }
    dbFilter.universityId = filters.universityId;
  }
  if (filters.category) dbFilter.category = filters.category;
  if (filters.projectStatus) dbFilter.projectStatus = filters.projectStatus;
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.featured !== undefined) dbFilter.featured = filters.featured;
  if (filters.ownerId) dbFilter.ownerId = filters.ownerId;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const projects = await ProjectModel.find(dbFilter)
    .sort({ featured: -1, featuredAt: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return projects.map((project) =>
    serializeProject(project as Record<string, unknown>),
  );
}

export async function getProject(projectId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);

  return serializeProject(project as Record<string, unknown>);
}

export async function updateProject(projectId: string, input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot update this project.");
  }
  const payload = updateProjectSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };

  if (payload.title !== undefined) update.title = payload.title;
  if (payload.description !== undefined)
    update.description = payload.description;
  if (payload.shortDescription !== undefined) {
    update.shortDescription = payload.shortDescription;
    update.summary = payload.shortDescription;
  }
  if (payload.coverImage !== undefined) {
    update.coverImage = payload.coverImage ?? null;
    update.coverImageUrl = payload.coverImage ?? null;
  }
  if (payload.projectStatus !== undefined)
    update.projectStatus = payload.projectStatus;
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.techStack !== undefined) {
    update.techStack = payload.techStack;
    update.skills = payload.techStack;
  }
  if (payload.projectUrl !== undefined) {
    update.projectUrl = payload.projectUrl ?? null;
    update.demoUrl = payload.projectUrl ?? null;
  }
  if (payload.repositoryUrl !== undefined)
    update.repositoryUrl = payload.repositoryUrl ?? null;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.roleVisibility !== undefined)
    update.roleVisibility = payload.roleVisibility;

  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_UPDATED",
    entityType: "project",
    entityId: projectId,
    before: serializeProject(project as Record<string, unknown>),
    after: updated
      ? serializeProject(updated as Record<string, unknown>)
      : null,
  });

  return serializeProject(updated as Record<string, unknown>);
}

export async function publishProject(projectId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot publish this project.");
  }
  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...deletedFilter },
    { $set: { status: "PUBLISHED", updatedById: actor.id } },
    { new: true },
  ).lean();

  await createActivity({
    actorId: actor.id,
    actorType: actor.role,
    universityId: String(project.universityId),
    collegeId: typeof project.collegeId === "string" ? project.collegeId : null,
    departmentId:
      typeof project.departmentId === "string" ? project.departmentId : null,
    activityType: "PROJECT_CREATED",
    title: String(project.title),
    description: String(project.shortDescription ?? project.summary),
    entityType: "project",
    entityId: projectId,
    visibility: feedVisibility(project.visibility),
    score: 0,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_PUBLISHED",
    entityType: "project",
    entityId: projectId,
  });

  return serializeProject(updated as Record<string, unknown>);
}

export async function archiveProject(projectId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot archive this project.");
  }
  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...deletedFilter },
    {
      $set: {
        projectStatus: "ARCHIVED",
        status: "ARCHIVED",
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_ARCHIVED",
    entityType: "project",
    entityId: projectId,
  });

  return serializeProject(updated as Record<string, unknown>);
}

export async function deleteProject(projectId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot delete this project.");
  }
  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        projectStatus: "ARCHIVED",
        deletedAt: new Date(),
        deletedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  return serializeProject(updated as Record<string, unknown>);
}

export async function addProjectMember(projectId: string, input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot manage project members.");
  }
  const payload = addProjectMemberSchema.parse(input);
  const user = await UserModel.findOne({
    _id: payload.userId,
    universityId: project.universityId,
    ...deletedFilter,
  }).lean();
  if (!user) throw notFound("Project member user not found.");

  const member = await ProjectMemberModel.findOneAndUpdate(
    { projectId, userId: payload.userId },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: project.universityId,
        projectId,
        userId: payload.userId,
        joinedAt: new Date(),
      },
      $set: { role: payload.role },
    },
    { upsert: true, new: true },
  ).lean();

  await ProjectModel.updateOne(
    { _id: projectId },
    { $addToSet: { teamMemberIds: payload.userId } },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_MEMBER_ADDED",
    entityType: "project",
    entityId: projectId,
    metadata: payload,
  });

  return serializeMember(member as Record<string, unknown>);
}

export async function removeProjectMember(projectId: string, userId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot manage project members.");
  }
  if (userId === project.ownerId)
    throw forbidden("Project owner cannot be removed.");

  await ProjectMemberModel.deleteOne({ projectId, userId });
  await ProjectModel.updateOne(
    { _id: projectId },
    { $pull: { teamMemberIds: userId } },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_MEMBER_REMOVED",
    entityType: "project",
    entityId: projectId,
    metadata: { userId },
  });

  return { removed: true };
}

export async function listProjectMembers(projectId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  await getVisibleProjectForActor(projectId, actor);
  const members = await ProjectMemberModel.find({ projectId })
    .sort({ role: 1, joinedAt: 1 })
    .lean();

  return members.map((member) =>
    serializeMember(member as Record<string, unknown>),
  );
}

export async function addProjectLink(projectId: string, input: unknown) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot manage project links.");
  }
  const payload = addProjectLinkSchema.parse(input);
  const link = await ProjectDocumentModel.create({
    _id: randomUUID(),
    universityId: project.universityId,
    projectId,
    uploadedById: actor.id,
    title: payload.title,
    fileUrl: payload.url,
    fileType: payload.type,
    visibility: project.visibility,
    status: "ACTIVE",
    metadata: {
      description: payload.description ?? null,
      linkType: payload.type,
    },
    createdById: actor.id,
  });

  await ProjectModel.updateOne(
    { _id: projectId },
    { $inc: { documentCount: 1 } },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_LINK_ADDED",
    entityType: "project",
    entityId: projectId,
    metadata: { linkId: link._id, type: payload.type },
  });

  return serializeLink(link.toObject());
}

export async function listProjectLinks(projectId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  await getVisibleProjectForActor(projectId, actor);
  const links = await ProjectDocumentModel.find({
    projectId,
    status: "ACTIVE",
    ...deletedFilter,
  })
    .sort({ createdAt: -1 })
    .lean();

  return links.map((link) => serializeLink(link as Record<string, unknown>));
}

export async function updateProjectVisibility(
  projectId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectPostgres();
  const project = await getVisibleProjectForActor(projectId, actor);
  if (
    !(await canManageProjectForActor(actor, project as Record<string, unknown>))
  ) {
    throw forbidden("You cannot manage project visibility.");
  }
  const payload = updateProjectVisibilitySchema.parse(input);
  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...deletedFilter },
    {
      $set: {
        visibility: payload.visibility,
        roleVisibility: payload.roleVisibility,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_VISIBILITY_UPDATED",
    entityType: "project",
    entityId: projectId,
    metadata: payload,
  });

  return serializeProject(updated as Record<string, unknown>);
}

export async function setProjectFeatured(projectId: string, featured: boolean) {
  const actor = await requireAuth();
  await connectPostgres();
  if (!canModerateProjects(actor))
    throw forbidden("Project moderation access is required.");
  const project = await getVisibleProjectForActor(projectId, actor);
  const updated = await ProjectModel.findOneAndUpdate(
    { _id: projectId, ...deletedFilter },
    {
      $set: {
        featured,
        featuredAt: featured ? new Date() : null,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(project.universityId),
    action: "PROJECT_UPDATED",
    entityType: "project",
    entityId: projectId,
    metadata: { featured },
  });

  return serializeProject(updated as Record<string, unknown>);
}

export async function getFeaturedProjects(query: unknown = {}) {
  return listProjects({ ...projectQuerySchema.parse(query), featured: true });
}

export async function getUserProjects(userId: string) {
  return listProjects({ ownerId: userId, limit: 100 });
}

export async function getUniversityProjects(universityId?: string) {
  return listProjects({ universityId, limit: 100 });
}
