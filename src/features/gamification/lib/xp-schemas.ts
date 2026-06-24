import { z } from "zod";

export const xpActionSchema = z.enum([
  "DAILY_LOGIN",
  "CREATE_PROJECT",
  "PUBLISH_PROJECT",
  "RECEIVE_PROJECT_STAR",
  "CREATE_FORUM_POST",
  "RECEIVE_FORUM_UPVOTE",
  "JOIN_EVENT",
  "ATTEND_EVENT",
  "CREATE_MARKETPLACE_PRODUCT",
  "RECEIVE_ORDER_REQUEST",
  "COMPLETE_CAREER_PROFILE",
  "APPLY_OPPORTUNITY",
  "BECOME_MENTOR",
  "COMPLETE_MENTORSHIP",
  "JOIN_COMMUNITY",
  "CREATE_COMMUNITY",
  "VOTE_IN_POLL",
  "SUBMIT_SUGGESTION",
  "EARN_BADGE",
  "COMPLETE_ACHIEVEMENT",
  "STREAK_MILESTONE",
]);

export const xpSourceTypeSchema = z.enum([
  "AUTH",
  "PROJECT",
  "FORUM",
  "EVENT",
  "MARKETPLACE",
  "ORDER",
  "CAREER_PROFILE",
  "OPPORTUNITY",
  "MENTORSHIP",
  "COMMUNITY",
  "POLL",
  "SUGGESTION",
  "ACHIEVEMENT",
  "STREAK",
  "SYSTEM",
]);

export const xpLeaderboardTimeframeSchema = z.enum([
  "TODAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "ALL_TIME",
]);

export const awardXpSchema = z.object({
  userId: z.string().trim().min(1),
  action: xpActionSchema,
  xpAwarded: z.coerce.number().int().min(1).max(10000).optional(),
  sourceType: xpSourceTypeSchema,
  sourceId: z.string().trim().min(1).max(120).optional().nullable(),
  idempotencyKey: z.string().trim().min(8).max(180).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const removeXpSchema = z.object({
  userId: z.string().trim().min(1),
  action: xpActionSchema,
  xpAmount: z.coerce.number().int().min(1).max(10000),
  sourceType: xpSourceTypeSchema.default("SYSTEM"),
  sourceId: z.string().trim().min(1).max(120).optional().nullable(),
  reason: z.string().trim().min(1).max(240).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const xpHistoryQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  action: xpActionSchema.optional(),
  sourceType: xpSourceTypeSchema.optional(),
  sourceId: z.string().trim().min(1).optional(),
  transactionType: z.enum(["AWARD", "REMOVE"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const xpBalanceQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
});

export const xpLeaderboardQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  timeframe: xpLeaderboardTimeframeSchema.optional().default("ALL_TIME"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type XpActionInput = z.infer<typeof xpActionSchema>;
export type AwardXpInput = z.infer<typeof awardXpSchema>;
export type RemoveXpInput = z.infer<typeof removeXpSchema>;
export type XpHistoryQueryInput = z.infer<typeof xpHistoryQuerySchema>;
export type XpBalanceQueryInput = z.infer<typeof xpBalanceQuerySchema>;
export type XpLeaderboardQueryInput = z.infer<typeof xpLeaderboardQuerySchema>;
