import { z } from "zod";

export const rewardEventTriggerSchema = z.enum([
  "XP_EARNED",
  "BADGE_EARNED",
  "ACHIEVEMENT_UNLOCKED",
  "LEVEL_UP",
  "LEADERBOARD_PROMOTION",
  "MILESTONE_REACHED",
]);

export const rewardAnimationTypeSchema = z.enum([
  "CONFETTI",
  "BADGE_POP",
  "LEVEL_UP",
  "TROPHY",
  "FIREWORKS",
  "SPOTLIGHT",
]);

export const rewardEventStatusSchema = z.enum(["UNSEEN", "SEEN", "ARCHIVED"]);

export const createRewardEventSchema = z.object({
  userId: z.string().trim().min(1),
  universityId: z.string().trim().min(1).optional(),
  trigger: rewardEventTriggerSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  reward: z.record(z.unknown()).optional().nullable(),
  xp: z.coerce.number().int().min(0).max(100000).optional().default(0),
  badge: z.record(z.unknown()).optional().nullable(),
  animationType: rewardAnimationTypeSchema.optional().default("CONFETTI"),
  entityType: z.string().trim().min(1).max(80).optional().nullable(),
  entityId: z.string().trim().min(1).max(120).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const rewardEventQuerySchema = z.object({
  status: rewardEventStatusSchema.optional(),
  trigger: rewardEventTriggerSchema.optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const updateRewardEventStatusSchema = z.object({
  status: z.enum(["SEEN", "ARCHIVED"]),
});

export type CreateRewardEventInput = z.infer<typeof createRewardEventSchema>;
