import { z } from "zod";

import {
  notificationChannelsSchema,
  notificationPrioritySchema,
  notificationTargetSchema,
} from "@/features/notifications/lib/schemas";

export const notificationIntelligenceTypeSchema = z.enum([
  "RECOMMENDATIONS",
  "MARKETPLACE",
  "PROJECTS",
  "COMMUNITIES",
  "EVENTS",
  "MENTORSHIP",
  "EMPLOYERS",
  "GOVERNANCE",
]);

export const notificationIntelligenceDispatchSchema = z.object({
  type: notificationIntelligenceTypeSchema,
  target: notificationTargetSchema,
  senderId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1000),
  entityType: z.string().trim().min(1).max(80).optional().nullable(),
  entityId: z.string().trim().min(1).max(120).optional().nullable(),
  actionUrl: z.string().trim().max(500).optional().nullable(),
  image: z.string().trim().url().optional().nullable(),
  priority: notificationPrioritySchema.optional(),
  channels: notificationChannelsSchema,
  dedupeKey: z.string().trim().min(1).max(240).optional(),
  dedupeWindowMinutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(60 * 24 * 30)
    .optional()
    .default(60 * 24),
  metadata: z.record(z.unknown()).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const notificationIntelligenceSummaryQuerySchema = z
  .object({
    universityId: z.string().trim().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.to < value.from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date range end must be after the start date.",
        path: ["to"],
      });
    }
  });

export type NotificationIntelligenceType = z.infer<
  typeof notificationIntelligenceTypeSchema
>;
