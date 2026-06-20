import { z } from "zod";

export const projectViewTrackingSchema = z.object({
  anonymousId: z.string().trim().min(1).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
});

export const projectEngagementTrackingSchema = z.object({
  anonymousId: z.string().trim().min(1).optional().nullable(),
  linkId: z.string().trim().min(1).optional().nullable(),
  url: z.string().trim().url().optional().nullable(),
  referrer: z.string().trim().max(500).optional().nullable(),
});

export const projectAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  universityId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});
