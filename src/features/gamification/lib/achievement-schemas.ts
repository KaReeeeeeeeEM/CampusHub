import { z } from "zod";

export const achievementVisibilitySchema = z.enum([
  "PUBLIC",
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
  "PRIVATE",
]);

export const achievementStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
]);

export const userAchievementStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
]);

export const badgeRewardSchema = z
  .object({
    badgeId: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.badgeId) || Boolean(value.slug), {
    message: "Badge reward requires badgeId or slug.",
    path: ["badgeId"],
  });

export const createAchievementSchema = z.object({
  universityId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1).max(140),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(1200).optional().nullable(),
  requirements: z.record(z.string(), z.unknown()),
  xpReward: z.coerce.number().int().min(0).max(50000).optional().default(0),
  badgeReward: badgeRewardSchema.optional().nullable(),
  visibility: achievementVisibilitySchema.optional().default("UNIVERSITY"),
  isGlobal: z.coerce.boolean().optional().default(false),
  status: achievementStatusSchema.optional().default("ACTIVE"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const listAchievementsQuerySchema = z.object({
  q: z.string().trim().optional(),
  universityId: z.string().trim().min(1).optional(),
  visibility: achievementVisibilitySchema.optional(),
  status: achievementStatusSchema.optional().default("ACTIVE"),
  includeGlobal: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

const achievementIdentityShape = {
  achievementId: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
};

export const achievementIdentitySchema = z
  .object(achievementIdentityShape)
  .refine((value) => Boolean(value.achievementId) || Boolean(value.slug), {
    message: "Either achievementId or slug is required.",
    path: ["achievementId"],
  });

export const updateAchievementProgressSchema = z
  .object({
    ...achievementIdentityShape,
    userId: z.string().trim().min(1),
    progress: z.record(z.string(), z.unknown()).optional().nullable(),
    progressValue: z.coerce.number().min(0).optional(),
    incrementBy: z.coerce.number().min(0).optional(),
    targetValue: z.coerce.number().min(1).optional(),
    complete: z.coerce.boolean().optional().default(false),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .refine((value) => Boolean(value.achievementId) || Boolean(value.slug), {
    message: "Either achievementId or slug is required.",
    path: ["achievementId"],
  });

export const completeAchievementSchema = z
  .object({
    ...achievementIdentityShape,
    userId: z.string().trim().min(1),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .refine((value) => Boolean(value.achievementId) || Boolean(value.slug), {
    message: "Either achievementId or slug is required.",
    path: ["achievementId"],
  });

export const userAchievementQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  universityId: z.string().trim().min(1).optional(),
  status: userAchievementStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;
export type UpdateAchievementProgressInput = z.infer<
  typeof updateAchievementProgressSchema
>;
export type CompleteAchievementInput = z.infer<typeof completeAchievementSchema>;
