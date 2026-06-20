import { z } from "zod";

export const rankingLeaderboardSchema = z.enum([
  "XP",
  "PROJECTS",
  "MARKETPLACE",
  "MENTORSHIP",
  "COMMUNITIES",
  "EVENTS",
  "FORUMS",
  "ACHIEVEMENTS",
]);

export const rankingScopeSchema = z.enum([
  "GLOBAL",
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
]);

export const rankingTimeFilterSchema = z.enum([
  "TODAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "ALL_TIME",
]);

export const rankingQuerySchema = z.object({
  leaderboard: rankingLeaderboardSchema,
  scope: rankingScopeSchema.optional().default("UNIVERSITY"),
  timeFilter: rankingTimeFilterSchema.optional().default("ALL_TIME"),
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type RankingLeaderboardInput = z.infer<typeof rankingLeaderboardSchema>;
export type RankingScopeInput = z.infer<typeof rankingScopeSchema>;
export type RankingTimeFilterInput = z.infer<typeof rankingTimeFilterSchema>;
export type RankingQueryInput = z.infer<typeof rankingQuerySchema>;
