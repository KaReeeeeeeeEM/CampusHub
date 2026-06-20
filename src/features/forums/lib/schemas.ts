import { z } from "zod";

export const forumVisibilitySchema = z.enum([
  "PUBLIC",
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
]);

export const forumStatusSchema = z.enum([
  "ACTIVE",
  "HIDDEN",
  "REMOVED",
  "ARCHIVED",
  "DELETED",
]);

export const forumCategoryStatusSchema = z.enum([
  "ACTIVE",
  "LOCKED",
  "ARCHIVED",
]);

export const forumVoteSchema = z.enum(["UPVOTE", "DOWNVOTE"]);

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url(),
  fileType: z.string().trim().max(80).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
});

export const createForumCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  icon: z.string().trim().max(80).optional().nullable(),
  color: z.string().trim().max(32).optional().nullable(),
  status: forumCategoryStatusSchema.default("ACTIVE"),
});

export const createForumPostSchema = z.object({
  categoryId: z.string().trim().min(1),
  title: z.string().trim().min(4).max(180),
  content: z.string().trim().min(1).max(10000),
  attachments: z.array(attachmentSchema).optional().default([]),
  visibility: forumVisibilitySchema.default("UNIVERSITY"),
  collegeId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).optional().default([]),
});

export const updateForumPostSchema = z.object({
  title: z.string().trim().min(4).max(180).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
  attachments: z.array(attachmentSchema).optional(),
  visibility: forumVisibilitySchema.optional(),
  collegeId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).optional(),
});

export const forumPostQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  categoryId: z.string().trim().optional(),
  visibility: forumVisibilitySchema.optional(),
  status: forumStatusSchema.optional(),
  mine: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const createForumCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  parentCommentId: z.string().trim().min(1).optional().nullable(),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const updateForumCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const moderationSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const forumReportSchema = z.object({
  reason: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  entityType: z.enum(["POST", "COMMENT"]).default("POST"),
});
