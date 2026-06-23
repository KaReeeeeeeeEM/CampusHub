import { z } from "zod";

import { userRoleSchema } from "@/features/auth/lib/schemas";

export const notificationTypeSchema = z.enum([
  "RECOMMENDATION",
  "ANNOUNCEMENT",
  "COMMUNITY",
  "EVENT",
  "EVENT_REMINDER",
  "ALMANAC_REMINDER",
  "POLL",
  "FORUM",
  "SUGGESTION",
  "PROJECT",
  "PROJECT_STAR",
  "PROJECT_COMMENT",
  "MARKETPLACE",
  "ORDER",
  "MENTORSHIP",
  "OPPORTUNITY",
  "EMPLOYER",
  "GOVERNANCE",
  "BADGE",
  "STREAK_REMINDER",
  "XP",
  "SYSTEM",
]);

export const notificationPrioritySchema = z.enum([
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
]);

export const notificationStatusSchema = z.enum(["UNREAD", "READ", "ARCHIVED"]);

export const notificationChannelsSchema = z
  .object({
    inApp: z.coerce.boolean().optional().default(true),
    email: z.coerce.boolean().optional().default(false),
    push: z.coerce.boolean().optional().default(false),
    sms: z.coerce.boolean().optional().default(false),
  })
  .optional()
  .default({
    inApp: true,
    email: false,
    push: false,
    sms: false,
  });

export const notificationTargetSchema = z
  .object({
    recipientId: z.string().trim().min(1).optional(),
    recipientIds: z.array(z.string().trim().min(1)).optional().default([]),
    universityId: z.string().trim().min(1).optional(),
    roles: z.array(userRoleSchema).optional().default([]),
    collegeIds: z.array(z.string().trim().min(1)).optional().default([]),
    departmentIds: z.array(z.string().trim().min(1)).optional().default([]),
    customAudience: z.array(z.string().trim().min(1)).optional().default([]),
  })
  .refine(
    (target) =>
      Boolean(target.recipientId) ||
      target.recipientIds.length > 0 ||
      Boolean(target.universityId) ||
      target.roles.length > 0 ||
      target.collegeIds.length > 0 ||
      target.departmentIds.length > 0 ||
      target.customAudience.length > 0,
    "At least one notification target is required.",
  );

export const createNotificationSchema = z.object({
  target: notificationTargetSchema,
  senderId: z.string().trim().min(1).optional().nullable(),
  type: notificationTypeSchema,
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1000),
  entityType: z.string().trim().min(1).max(80).optional().nullable(),
  entityId: z.string().trim().min(1).max(120).optional().nullable(),
  actionUrl: z.string().trim().max(500).optional().nullable(),
  image: z.string().trim().url().optional().nullable(),
  priority: notificationPrioritySchema.default("NORMAL"),
  channels: notificationChannelsSchema,
  metadata: z.record(z.unknown()).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const notificationQuerySchema = z.object({
  status: notificationStatusSchema.optional(),
  type: notificationTypeSchema.optional(),
  priority: notificationPrioritySchema.optional(),
  entityType: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
  includeArchived: z.coerce.boolean().optional().default(false),
});

export const markNotificationReadSchema = z.object({
  read: z.coerce.boolean().optional().default(true),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
