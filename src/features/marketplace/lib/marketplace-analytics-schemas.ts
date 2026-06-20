import { z } from "zod";

export const marketplaceAnalyticsTimeFilterSchema = z
  .enum(["TODAY", "WEEK", "MONTH", "YEAR", "ALL_TIME"])
  .optional()
  .default("MONTH");

export const marketplaceAnalyticsQuerySchema = z.object({
  timeFilter: marketplaceAnalyticsTimeFilterSchema,
  universityId: z.string().trim().min(1).optional(),
  ownerId: z.string().trim().min(1).optional(),
  shopId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type MarketplaceAnalyticsTimeFilter = z.infer<
  typeof marketplaceAnalyticsTimeFilterSchema
>;
