import { z } from "zod";

export const activityTypeSchema = z.enum([
  "ANNOUNCEMENT_CREATED",
  "EVENT_CREATED",
  "EVENT_JOINED",
  "POLL_CREATED",
  "FORUM_POST",
  "PROJECT_CREATED",
  "PROJECT_STARRED",
  "PRODUCT_CREATED",
  "ORDER_CREATED",
  "BADGE_EARNED",
  "XP_EARNED",
  "ACHIEVEMENT_COMPLETED",
  "MENTORSHIP_STARTED",
  "OPPORTUNITY_POSTED",
]);

export const activityVisibilitySchema = z.enum([
  "PUBLIC",
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
  "PRIVATE",
]);

export const createActivitySchema = z.object({
  actorId: z.string().trim().min(1).optional().nullable(),
  actorType: z.string().trim().max(60).optional().nullable(),
  universityId: z.string().trim().min(1),
  collegeId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  activityType: activityTypeSchema,
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(1000).optional().nullable(),
  entityType: z.string().trim().min(1).max(80),
  entityId: z.string().trim().min(1).max(120),
  image: z.string().trim().url().optional().nullable(),
  visibility: activityVisibilitySchema.default("UNIVERSITY"),
  metadata: z.record(z.unknown()).optional().nullable(),
  score: z.coerce.number().optional().default(0),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const activityFeedQuerySchema = z.object({
  activityType: activityTypeSchema.optional(),
  visibility: activityVisibilitySchema.optional(),
  entityType: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const scopedFeedQuerySchema = activityFeedQuerySchema.extend({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type ActivityFeedQueryInput = z.infer<typeof activityFeedQuerySchema>;
export type ScopedFeedQueryInput = z.infer<typeof scopedFeedQuerySchema>;
