import { z } from "zod";

export const recommendationTypeSchema = z.enum([
  "ALL",
  "PROJECT",
  "MENTOR",
  "COMMUNITY",
  "EVENT",
  "OPPORTUNITY",
  "MARKETPLACE_PRODUCT",
  "EMPLOYER",
]);

export const recommendationQuerySchema = z.object({
  type: recommendationTypeSchema.optional().default("ALL"),
  universityId: z.string().trim().min(1).optional(),
  targetUserId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type RecommendationType = z.infer<typeof recommendationTypeSchema>;
