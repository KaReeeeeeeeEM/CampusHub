import { z } from "zod";

export const employerAnalyticsTimeFilterSchema = z
  .enum(["TODAY", "WEEK", "MONTH", "YEAR", "ALL_TIME"])
  .optional()
  .default("MONTH");

export const employerAnalyticsQuerySchema = z.object({
  timeFilter: employerAnalyticsTimeFilterSchema,
  universityId: z.string().trim().min(1).optional(),
  employerId: z.string().trim().min(1).optional(),
  opportunityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type EmployerAnalyticsTimeFilter = z.infer<
  typeof employerAnalyticsTimeFilterSchema
>;
