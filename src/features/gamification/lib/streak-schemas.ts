import { z } from "zod";

export const streakTypeSchema = z.enum([
  "DAILY_LOGIN",
  "PROJECT_ACTIVITY",
  "COMMUNITY_ACTIVITY",
  "FORUM_ACTIVITY",
  "LEARNING_ACTIVITY",
]);

export const streakStatusSchema = z.enum(["ACTIVE", "BROKEN", "ARCHIVED"]);

export const recordStreakActivitySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  streakType: streakTypeSchema,
  activityDate: z.coerce.date().optional(),
  useRecovery: z.coerce.boolean().optional().default(false),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const streakQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  streakType: streakTypeSchema.optional(),
  status: streakStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const streakSummaryQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  streakType: streakTypeSchema.optional().default("DAILY_LOGIN"),
});

export const grantRecoveryTokenSchema = z.object({
  userId: z.string().trim().min(1),
  streakType: streakTypeSchema,
  amount: z.coerce.number().int().min(1).max(30).optional().default(1),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type StreakTypeInput = z.infer<typeof streakTypeSchema>;
