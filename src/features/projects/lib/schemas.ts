import { z } from "zod";

import { userRoleSchema } from "@/features/auth/lib/schemas";

export const projectStatusSchema = z.enum([
  "IDEA",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
]);

export const projectVisibilitySchema = z.enum([
  "PUBLIC",
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
  "CUSTOM_ROLES",
  "PRIVATE",
]);

export const projectMemberRoleSchema = z.enum([
  "OWNER",
  "CO_OWNER",
  "CONTRIBUTOR",
  "MENTOR",
]);

export const relatedLinkTypeSchema = z.enum([
  "GOOGLE_DOCS",
  "PDF",
  "RESEARCH_PAPER",
  "DESIGN_FILE",
  "PRESENTATION",
  "GITHUB_REPOSITORY",
  "EXTERNAL_RESOURCE",
]);

export const createProjectSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(1).max(10000),
  shortDescription: z.string().trim().min(1).max(280),
  coverImage: z.string().trim().url().optional().nullable(),
  projectStatus: projectStatusSchema.default("IDEA"),
  category: z.string().trim().min(1).max(80),
  techStack: z.array(z.string().trim().min(1).max(60)).optional().default([]),
  projectUrl: z.string().trim().url().optional().nullable(),
  repositoryUrl: z.string().trim().url().optional().nullable(),
  visibility: projectVisibilitySchema.default("UNIVERSITY"),
  roleVisibility: z.array(userRoleSchema).optional().default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  category: z.string().trim().optional(),
  projectStatus: projectStatusSchema.optional(),
  visibility: projectVisibilitySchema.optional(),
  featured: z.coerce.boolean().optional(),
  ownerId: z.string().trim().optional(),
  universityId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().trim().min(1),
  role: projectMemberRoleSchema,
});

export const addProjectLinkSchema = z.object({
  title: z.string().trim().min(1).max(180),
  url: z.string().trim().url(),
  type: relatedLinkTypeSchema,
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateProjectVisibilitySchema = z.object({
  visibility: projectVisibilitySchema,
  roleVisibility: z.array(userRoleSchema).optional().default([]),
});

export const projectAppreciationQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const savedProjectsQuerySchema = z.object({
  type: z.enum(["FAVORITE", "SAVED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const projectLeaderboardTypeSchema = z.enum([
  "MOST_VIEWED",
  "MOST_STARRED",
  "TRENDING",
  "MOST_CLICKED",
  "MOST_SHARED",
  "NEWEST_RISING",
]);

export const projectLeaderboardScopeSchema = z.enum([
  "GLOBAL",
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
]);

export const projectLeaderboardTimeFilterSchema = z.enum([
  "TODAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "ALL_TIME",
]);

export const projectLeaderboardQuerySchema = z.object({
  type: projectLeaderboardTypeSchema.optional().default("TRENDING"),
  scope: projectLeaderboardScopeSchema.optional().default("UNIVERSITY"),
  timeFilter: projectLeaderboardTimeFilterSchema.optional().default("WEEK"),
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type ProjectLeaderboardType = z.infer<
  typeof projectLeaderboardTypeSchema
>;
export type ProjectLeaderboardTimeFilter = z.infer<
  typeof projectLeaderboardTimeFilterSchema
>;

export const publicProjectQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  category: z.string().trim().optional(),
  universityId: z.string().trim().min(1).optional(),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const publicProjectViewTrackingSchema = z.object({
  anonymousId: z.string().trim().min(1).max(120).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
});
