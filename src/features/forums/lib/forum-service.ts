import { randomUUID } from "node:crypto";

import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import {
  createForumCategorySchema,
  createForumCommentSchema,
  createForumPostSchema,
  forumPostQuerySchema,
  forumReportSchema,
  forumVoteSchema,
  moderationSchema,
  updateForumCommentSchema,
  updateForumPostSchema,
} from "@/features/forums/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ForumEngagementModel,
  ForumModel,
  ForumReplyModel,
  ForumTopicModel,
  ModerationActionModel,
  ReportModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

const DEFAULT_CATEGORIES = [
  "Academics",
  "Projects",
  "Campus Life",
  "Technology",
  "Career",
  "Opportunities",
  "Marketplace",
  "Sports",
  "General",
] as const;

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

function isRepresentative(actor: AuthUser) {
  return (
    actor.position === "REPRESENTATIVE" ||
    actor.studentLeadershipPositions?.includes("REPRESENTATIVE") ||
    actor.roles?.includes("REPRESENTATIVE")
  );
}

function canModerate(actor: AuthUser, post?: Record<string, unknown>) {
  if (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, "FORUM_MODERATE")
  ) {
    return true;
  }

  if (!isRepresentative(actor)) return false;
  if (!post) return true;

  return !post.collegeId || post.collegeId === actor.collegeId;
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function visibilityFilter(actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const filters: Record<string, unknown>[] = [
    { universityId, visibility: { $in: ["PUBLIC", "UNIVERSITY"] } },
  ];

  if (actor.collegeId) {
    filters.push({
      universityId,
      visibility: "COLLEGE",
      collegeId: actor.collegeId,
    });
  }
  if (actor.departmentId) {
    filters.push({
      universityId,
      visibility: "DEPARTMENT",
      departmentId: actor.departmentId,
    });
  }

  return filters;
}

function serializeCategory(category: Record<string, unknown>) {
  return {
    id: String(category._id),
    universityId: String(category.universityId),
    name: String(category.name),
    description:
      typeof category.description === "string" ? category.description : null,
    icon: typeof category.icon === "string" ? category.icon : null,
    color: typeof category.color === "string" ? category.color : null,
    status: String(category.status),
    topicCount: Number(category.topicCount ?? 0),
    replyCount: Number(category.replyCount ?? 0),
    createdAt: serializeDate(category.createdAt),
    updatedAt: serializeDate(category.updatedAt),
  };
}

function serializePost(post: Record<string, unknown>) {
  return {
    id: String(post._id),
    universityId: String(post.universityId),
    collegeId: typeof post.collegeId === "string" ? post.collegeId : null,
    departmentId:
      typeof post.departmentId === "string" ? post.departmentId : null,
    categoryId: String(post.categoryId ?? post.forumId),
    authorId: String(post.authorId),
    title: String(post.title),
    content: String(post.content ?? post.body),
    attachments: Array.isArray(post.attachments) ? post.attachments : [],
    visibility: String(post.visibility ?? "UNIVERSITY"),
    isPinned: Boolean(post.isPinned),
    isLocked: Boolean(post.isLocked),
    viewCount: Number(post.viewCount ?? 0),
    upvotes: Number(post.upvotes ?? 0),
    downvotes: Number(post.downvotes ?? 0),
    bookmarkCount: Number(post.bookmarkCount ?? 0),
    shareCount: Number(post.shareCount ?? 0),
    replyCount: Number(post.replyCount ?? 0),
    reportCount: Number(post.reportCount ?? 0),
    trendingScore: Number(post.trendingScore ?? 0),
    status: String(post.status),
    createdAt: serializeDate(post.createdAt),
    updatedAt: serializeDate(post.updatedAt),
  };
}

function serializeComment(comment: Record<string, unknown>) {
  return {
    id: String(comment._id),
    postId: String(comment.postId ?? comment.topicId),
    authorId: String(comment.authorId),
    content: String(comment.content ?? comment.body),
    parentCommentId:
      typeof comment.parentCommentId === "string"
        ? comment.parentCommentId
        : typeof comment.parentReplyId === "string"
          ? comment.parentReplyId
          : null,
    attachments: Array.isArray(comment.attachments) ? comment.attachments : [],
    upvotes: Number(comment.upvotes ?? 0),
    downvotes: Number(comment.downvotes ?? 0),
    status: String(comment.status),
    createdAt: serializeDate(comment.createdAt),
    updatedAt: serializeDate(comment.updatedAt),
  };
}

function calculateTrendingScore(post: Record<string, unknown>) {
  const views = Number(post.viewCount ?? 0);
  const upvotes = Number(post.upvotes ?? 0);
  const downvotes = Number(post.downvotes ?? 0);
  const replies = Number(post.replyCount ?? 0);
  const bookmarks = Number(post.bookmarkCount ?? 0);
  const shares = Number(post.shareCount ?? 0);

  return (
    upvotes * 3 -
    downvotes * 2 +
    replies * 4 +
    bookmarks * 2 +
    shares * 3 +
    views * 0.1
  );
}

async function refreshTrendingScore(postId: string) {
  const post = await ForumTopicModel.findById(postId).lean();
  if (!post) return;

  await ForumTopicModel.updateOne(
    { _id: postId },
    {
      $set: {
        trendingScore: calculateTrendingScore(post as Record<string, unknown>),
      },
    },
  );
}

async function ensureDefaultCategories(universityId: string) {
  for (const name of DEFAULT_CATEGORIES) {
    const slug = slugify(name);
    await ForumModel.updateOne(
      { universityId, slug },
      {
        $setOnInsert: {
          _id: randomUUID(),
          universityId,
          name,
          slug,
          description: `${name} discussions`,
          forumType: "CATEGORY",
          icon: null,
          color: null,
          visibility: "UNIVERSITY",
          status: "ACTIVE",
        },
      },
      { upsert: true },
    );
  }
}

async function getVisiblePost(postId: string, actor: AuthUser) {
  const post = await ForumTopicModel.findOne({
    _id: postId,
    status: { $ne: "DELETED" },
    ...deletedFilter,
    $or: visibilityFilter(actor),
  }).lean();

  if (!post) throw notFound("Forum post not found.");
  if (
    post.status !== "ACTIVE" &&
    post.authorId !== actor.id &&
    !canModerate(actor, post as Record<string, unknown>)
  ) {
    throw notFound("Forum post not found.");
  }

  return post;
}

async function getComment(commentId: string, actor: AuthUser) {
  const comment = await ForumReplyModel.findOne({
    _id: commentId,
    status: { $ne: "DELETED" },
    ...deletedFilter,
  }).lean();

  if (!comment) throw notFound("Forum comment not found.");
  await getVisiblePost(String(comment.postId ?? comment.topicId), actor);

  return comment;
}

export async function createForumCategory(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  if (!canModerate(actor))
    throw forbidden("Forum moderation access is required.");
  await connectMongo();
  const payload = createForumCategorySchema.parse(input);
  const category = await ForumModel.create({
    _id: randomUUID(),
    universityId,
    name: payload.name,
    slug: slugify(payload.name),
    description: payload.description ?? null,
    icon: payload.icon ?? null,
    color: payload.color ?? null,
    forumType: "CATEGORY",
    visibility: "UNIVERSITY",
    status: payload.status,
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "FORUM_CATEGORY_CREATED",
    entityType: "forum_category",
    entityId: String(category._id),
    after: serializeCategory(category.toObject()),
  });

  return serializeCategory(category.toObject());
}

export async function listForumCategories() {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  await ensureDefaultCategories(universityId);
  const categories = await ForumModel.find({
    universityId,
    forumType: "CATEGORY",
    status: { $ne: "ARCHIVED" },
    ...deletedFilter,
  })
    .sort({ name: 1 })
    .lean();

  return categories.map((category) =>
    serializeCategory(category as Record<string, unknown>),
  );
}

export async function createForumPost(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  const payload = createForumPostSchema.parse(input);
  const category = await ForumModel.findOne({
    _id: payload.categoryId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!category) throw notFound("Forum category not found.");
  if (
    payload.visibility === "COLLEGE" &&
    !(payload.collegeId ?? actor.collegeId)
  ) {
    throw forbidden("College visibility requires a college scope.");
  }
  if (
    payload.visibility === "DEPARTMENT" &&
    !(payload.departmentId ?? actor.departmentId)
  ) {
    throw forbidden("Department visibility requires a department scope.");
  }

  const post = await ForumTopicModel.create({
    _id: randomUUID(),
    universityId,
    forumId: payload.categoryId,
    categoryId: payload.categoryId,
    collegeId: payload.collegeId ?? actor.collegeId ?? null,
    departmentId: payload.departmentId ?? actor.departmentId ?? null,
    authorId: actor.id,
    title: payload.title,
    body: payload.content,
    content: payload.content,
    attachments: payload.attachments,
    visibility: payload.visibility,
    tags: payload.tags,
    status: "ACTIVE",
    lastActivityAt: new Date(),
    createdById: actor.id,
  });

  await ForumModel.updateOne(
    { _id: payload.categoryId },
    { $inc: { topicCount: 1 } },
  );
  await createActivity({
    actorId: actor.id,
    actorType: actor.role,
    universityId,
    collegeId: post.collegeId ?? null,
    departmentId: post.departmentId ?? null,
    activityType: "FORUM_POST",
    title: payload.title,
    description: payload.content.slice(0, 240),
    entityType: "forum_post",
    entityId: String(post._id),
    visibility: payload.visibility === "PUBLIC" ? "PUBLIC" : payload.visibility,
    score: 0,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "FORUM_POST_CREATED",
    entityType: "forum_post",
    entityId: String(post._id),
    after: serializePost(post.toObject()),
  });

  return serializePost(post.toObject());
}

export async function listForumPosts(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = forumPostQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    status: filters.status && canModerate(actor) ? filters.status : "ACTIVE",
    ...deletedFilter,
    $or: visibilityFilter(actor),
  };

  if (filters.categoryId) dbFilter.categoryId = filters.categoryId;
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.mine) dbFilter.authorId = actor.id;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const posts = await ForumTopicModel.find(dbFilter)
    .sort({ isPinned: -1, lastActivityAt: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return posts.map((post) => serializePost(post as Record<string, unknown>));
}

export async function getForumPost(postId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const post = await getVisiblePost(postId, actor);

  await viewForumPost(postId);
  const refreshed = await ForumTopicModel.findById(postId).lean();

  return serializePost((refreshed ?? post) as Record<string, unknown>);
}

export async function updateForumPost(postId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = updateForumPostSchema.parse(input);
  const post = await getVisiblePost(postId, actor);

  if (
    post.authorId !== actor.id &&
    !canModerate(actor, post as Record<string, unknown>)
  ) {
    throw forbidden("You cannot edit this forum post.");
  }

  const update: Record<string, unknown> = { updatedById: actor.id };
  if (payload.title !== undefined) update.title = payload.title;
  if (payload.content !== undefined) {
    update.content = payload.content;
    update.body = payload.content;
  }
  if (payload.attachments !== undefined)
    update.attachments = payload.attachments;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.collegeId !== undefined)
    update.collegeId = payload.collegeId ?? null;
  if (payload.departmentId !== undefined)
    update.departmentId = payload.departmentId ?? null;
  if (payload.tags !== undefined) update.tags = payload.tags;

  const updated = await ForumTopicModel.findOneAndUpdate(
    { _id: postId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId,
    action: "FORUM_POST_UPDATED",
    entityType: "forum_post",
    entityId: postId,
    before: serializePost(post as Record<string, unknown>),
    after: updated ? serializePost(updated as Record<string, unknown>) : null,
  });

  return serializePost(updated as Record<string, unknown>);
}

export async function deleteForumPost(postId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const post = await getVisiblePost(postId, actor);

  if (
    post.authorId !== actor.id &&
    !canModerate(actor, post as Record<string, unknown>)
  ) {
    throw forbidden("You cannot delete this forum post.");
  }

  const updated = await ForumTopicModel.findOneAndUpdate(
    { _id: postId, ...deletedFilter },
    {
      $set: {
        status: "DELETED",
        deletedAt: new Date(),
        deletedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId,
    action: "FORUM_POST_DELETED",
    entityType: "forum_post",
    entityId: postId,
  });

  return serializePost(updated as Record<string, unknown>);
}

export async function moderateForumPost(
  postId: string,
  action: "PIN" | "UNPIN" | "LOCK" | "UNLOCK" | "HIDE" | "REMOVE",
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = moderationSchema.parse(input);
  const post = await getVisiblePost(postId, actor);
  if (!canModerate(actor, post as Record<string, unknown>)) {
    throw forbidden("Forum moderation access is required.");
  }

  const update: Record<string, unknown> = { updatedById: actor.id };
  if (action === "PIN") update.isPinned = true;
  if (action === "UNPIN") update.isPinned = false;
  if (action === "LOCK") update.isLocked = true;
  if (action === "UNLOCK") update.isLocked = false;
  if (action === "HIDE") update.status = "HIDDEN";
  if (action === "REMOVE") update.status = "REMOVED";

  const updated = await ForumTopicModel.findOneAndUpdate(
    { _id: postId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await ModerationActionModel.create({
    _id: randomUUID(),
    universityId: String(post.universityId),
    moderatorId: actor.id,
    entityType: "forum_post",
    entityId: postId,
    action,
    reason: payload.reason ?? null,
  });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(post.universityId),
    action: "FORUM_POST_MODERATED",
    entityType: "forum_post",
    entityId: postId,
    metadata: { action, reason: payload.reason ?? null },
  });

  return serializePost(updated as Record<string, unknown>);
}

export async function viewForumPost(postId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const post = await getVisiblePost(postId, actor);
  const result = await ForumEngagementModel.updateOne(
    {
      entityType: "POST",
      entityId: postId,
      userId: actor.id,
      engagementType: "VIEW",
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: post.universityId,
        entityType: "POST",
        entityId: postId,
        userId: actor.id,
        engagementType: "VIEW",
      },
    },
    { upsert: true },
  );

  if (result.upsertedCount) {
    await ForumTopicModel.updateOne(
      { _id: postId },
      { $inc: { viewCount: 1 } },
    );
    await refreshTrendingScore(postId);
  }

  return { viewed: true };
}

export async function voteForumEntity(
  entityType: "POST" | "COMMENT",
  entityId: string,
  vote: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const engagementType = forumVoteSchema.parse(vote);
  const entity =
    entityType === "POST"
      ? await getVisiblePost(entityId, actor)
      : await getComment(entityId, actor);
  const existing = await ForumEngagementModel.findOne({
    entityType,
    entityId,
    userId: actor.id,
    engagementType: { $in: ["UPVOTE", "DOWNVOTE"] },
  }).lean();

  const model = entityType === "POST" ? ForumTopicModel : ForumReplyModel;
  const inc: Record<string, number> = {};

  if (existing?.engagementType === engagementType) {
    await ForumEngagementModel.deleteOne({ _id: existing._id });
    inc[engagementType === "UPVOTE" ? "upvotes" : "downvotes"] = -1;
  } else {
    if (existing) {
      await ForumEngagementModel.deleteOne({ _id: existing._id });
      inc[existing.engagementType === "UPVOTE" ? "upvotes" : "downvotes"] = -1;
    }
    await ForumEngagementModel.create({
      _id: randomUUID(),
      universityId: entity.universityId,
      entityType,
      entityId,
      userId: actor.id,
      engagementType,
    });
    inc[engagementType === "UPVOTE" ? "upvotes" : "downvotes"] =
      (inc[engagementType === "UPVOTE" ? "upvotes" : "downvotes"] ?? 0) + 1;
  }

  await model.updateOne({ _id: entityId }, { $inc: inc });
  if (entityType === "POST") await refreshTrendingScore(entityId);
  else await refreshTrendingScore(String(entity.postId ?? entity.topicId));

  return {
    voted: existing?.engagementType !== engagementType,
    vote: engagementType,
  };
}

export async function toggleForumBookmark(postId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const post = await getVisiblePost(postId, actor);
  const existing = await ForumEngagementModel.findOne({
    entityType: "POST",
    entityId: postId,
    userId: actor.id,
    engagementType: "BOOKMARK",
  }).lean();

  if (existing) {
    await ForumEngagementModel.deleteOne({ _id: existing._id });
    await ForumTopicModel.updateOne(
      { _id: postId },
      { $inc: { bookmarkCount: -1 } },
    );
    await refreshTrendingScore(postId);
    return { bookmarked: false };
  }

  await ForumEngagementModel.create({
    _id: randomUUID(),
    universityId: post.universityId,
    entityType: "POST",
    entityId: postId,
    userId: actor.id,
    engagementType: "BOOKMARK",
  });
  await ForumTopicModel.updateOne(
    { _id: postId },
    { $inc: { bookmarkCount: 1 } },
  );
  await refreshTrendingScore(postId);

  return { bookmarked: true };
}

export async function shareForumPost(postId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const post = await getVisiblePost(postId, actor);
  await ForumEngagementModel.updateOne(
    {
      entityType: "POST",
      entityId: postId,
      userId: actor.id,
      engagementType: "SHARE",
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: post.universityId,
        entityType: "POST",
        entityId: postId,
        userId: actor.id,
        engagementType: "SHARE",
      },
    },
    { upsert: true },
  );
  await ForumTopicModel.updateOne({ _id: postId }, { $inc: { shareCount: 1 } });
  await refreshTrendingScore(postId);

  return { shared: true };
}

export async function createForumComment(postId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = createForumCommentSchema.parse(input);
  const post = await getVisiblePost(postId, actor);

  if (post.isLocked) throw forbidden("This forum post is locked.");

  const comment = await ForumReplyModel.create({
    _id: randomUUID(),
    universityId: post.universityId,
    topicId: postId,
    postId,
    authorId: actor.id,
    parentReplyId: payload.parentCommentId ?? null,
    parentCommentId: payload.parentCommentId ?? null,
    body: payload.content,
    content: payload.content,
    attachments: payload.attachments,
    status: "ACTIVE",
    createdById: actor.id,
  });

  await ForumTopicModel.updateOne(
    { _id: postId },
    {
      $inc: { replyCount: 1 },
      $set: { lastReplyAt: new Date(), lastActivityAt: new Date() },
    },
  );
  await ForumModel.updateOne(
    { _id: post.categoryId ?? post.forumId },
    { $inc: { replyCount: 1 } },
  );
  await refreshTrendingScore(postId);
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(post.universityId),
    action: "FORUM_COMMENT_CREATED",
    entityType: "forum_comment",
    entityId: String(comment._id),
  });

  return serializeComment(comment.toObject());
}

export async function listForumComments(postId: string) {
  const actor = await requireAuth();
  await connectMongo();
  await getVisiblePost(postId, actor);
  const comments = await ForumReplyModel.find({
    postId,
    status: "ACTIVE",
    ...deletedFilter,
  })
    .sort({ createdAt: 1 })
    .lean();

  return comments.map((comment) =>
    serializeComment(comment as Record<string, unknown>),
  );
}

export async function updateForumComment(commentId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = updateForumCommentSchema.parse(input);
  const comment = await getComment(commentId, actor);

  if (comment.authorId !== actor.id && !canModerate(actor)) {
    throw forbidden("You cannot edit this forum comment.");
  }

  const updated = await ForumReplyModel.findOneAndUpdate(
    { _id: commentId, ...deletedFilter },
    {
      $set: {
        body: payload.content,
        content: payload.content,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId,
    action: "FORUM_COMMENT_UPDATED",
    entityType: "forum_comment",
    entityId: commentId,
  });

  return serializeComment(updated as Record<string, unknown>);
}

export async function deleteForumComment(commentId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const comment = await getComment(commentId, actor);

  if (comment.authorId !== actor.id && !canModerate(actor)) {
    throw forbidden("You cannot delete this forum comment.");
  }

  const updated = await ForumReplyModel.findOneAndUpdate(
    { _id: commentId, ...deletedFilter },
    {
      $set: {
        status: "DELETED",
        deletedAt: new Date(),
        deletedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await ForumTopicModel.updateOne(
    { _id: comment.postId ?? comment.topicId },
    { $inc: { replyCount: -1 } },
  );
  await refreshTrendingScore(String(comment.postId ?? comment.topicId));
  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId,
    action: "FORUM_COMMENT_DELETED",
    entityType: "forum_comment",
    entityId: commentId,
  });

  return serializeComment(updated as Record<string, unknown>);
}

export async function reportForumEntity(entityId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = forumReportSchema.parse(input);
  const entity =
    payload.entityType === "COMMENT"
      ? await getComment(entityId, actor)
      : await getVisiblePost(entityId, actor);

  const report = await ReportModel.create({
    _id: randomUUID(),
    universityId: entity.universityId,
    reportedById: actor.id,
    entityType:
      payload.entityType === "COMMENT" ? "forum_comment" : "forum_post",
    entityId,
    reason: payload.reason,
    description: payload.description ?? null,
    metadata: { forum: true },
  });

  if (payload.entityType === "POST") {
    await ForumTopicModel.updateOne(
      { _id: entityId },
      { $inc: { reportCount: 1 } },
    );
  }
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(entity.universityId),
    action: "FORUM_REPORTED",
    entityType: report.entityType,
    entityId,
    metadata: { reportId: report._id, reason: payload.reason },
  });

  return { id: String(report._id), status: report.status };
}

export async function getTrendingForumPosts(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = forumPostQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    status: "ACTIVE",
    ...deletedFilter,
    $or: visibilityFilter(actor),
  };
  if (filters.categoryId) dbFilter.categoryId = filters.categoryId;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const posts = await ForumTopicModel.find(dbFilter)
    .sort({ trendingScore: -1, viewCount: -1, lastActivityAt: -1 })
    .limit(filters.limit)
    .lean();

  return posts.map((post) => serializePost(post as Record<string, unknown>));
}

export async function getForumAnalytics() {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectMongo();
  if (!canModerate(actor))
    throw forbidden("Forum moderation access is required.");

  const [categories, users, topDiscussions, totalPosts, totalReplies] =
    await Promise.all([
      ForumModel.find({ universityId, forumType: "CATEGORY", ...deletedFilter })
        .sort({ topicCount: -1, replyCount: -1 })
        .limit(10)
        .lean(),
      ForumTopicModel.aggregate([
        { $match: { universityId, status: "ACTIVE" } },
        {
          $group: {
            _id: "$authorId",
            posts: { $sum: 1 },
            replies: { $sum: "$replyCount" },
          },
        },
        { $sort: { posts: -1, replies: -1 } },
        { $limit: 10 },
      ]),
      ForumTopicModel.find({ universityId, status: "ACTIVE", ...deletedFilter })
        .sort({ trendingScore: -1, replyCount: -1 })
        .limit(10)
        .lean(),
      ForumTopicModel.countDocuments({
        universityId,
        status: "ACTIVE",
        ...deletedFilter,
      }),
      ForumReplyModel.countDocuments({
        universityId,
        status: "ACTIVE",
        ...deletedFilter,
      }),
    ]);

  return {
    mostActiveCategories: categories.map((category) =>
      serializeCategory(category as Record<string, unknown>),
    ),
    mostActiveUsers: users.map((user) => ({
      userId: String(user._id),
      posts: Number(user.posts ?? 0),
      replies: Number(user.replies ?? 0),
    })),
    topDiscussions: topDiscussions.map((post) =>
      serializePost(post as Record<string, unknown>),
    ),
    engagementRate: totalPosts ? totalReplies / totalPosts : 0,
  };
}
