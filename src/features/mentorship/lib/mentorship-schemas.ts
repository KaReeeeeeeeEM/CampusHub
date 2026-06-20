import { z } from "zod";

export const mentorProfileStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "INACTIVE",
]);

export const mentorshipRequestStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
]);

export const mentorshipSessionStatusSchema = z.enum([
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
]);

export const mentorAvailabilitySchema = z
  .object({
    timezone: z.string().trim().max(80).optional().nullable(),
    weeklyHours: z.coerce.number().min(0).max(80).optional().nullable(),
    windows: z
      .array(
        z.object({
          day: z
            .enum([
              "MONDAY",
              "TUESDAY",
              "WEDNESDAY",
              "THURSDAY",
              "FRIDAY",
              "SATURDAY",
              "SUNDAY",
            ])
            .optional(),
          startTime: z.string().trim().max(20).optional().nullable(),
          endTime: z.string().trim().max(20).optional().nullable(),
        }),
      )
      .optional()
      .default([]),
  })
  .optional()
  .nullable();

const mentorProfileBaseSchema = z.object({
  bio: z.string().trim().max(3000).optional().nullable(),
  expertise: z
    .array(z.string().trim().min(1).max(120))
    .optional()
    .default([]),
  availability: mentorAvailabilitySchema,
  maxMentees: z.coerce.number().int().min(1).max(100).optional().default(3),
  meetingPreferences: z
    .array(
      z.enum(["VIDEO", "AUDIO", "IN_PERSON", "CHAT", "EMAIL", "HYBRID"]),
    )
    .optional()
    .default([]),
  status: mentorProfileStatusSchema.optional().default("ACTIVE"),
});

export const createMentorProfileSchema = mentorProfileBaseSchema;

export const updateMentorProfileSchema = mentorProfileBaseSchema.partial();

export const mentorProfileQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  universityId: z.string().trim().min(1).optional(),
  expertise: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : value,
    z.array(z.string().trim().min(1)).optional().default([]),
  ),
  status: mentorProfileStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const createMentorshipRequestSchema = z.object({
  mentorId: z.string().trim().min(1),
  message: z.string().trim().max(1000).optional().nullable(),
  goals: z.array(z.string().trim().min(1).max(200)).optional().default([]),
});

export const mentorshipRequestQuerySchema = z.object({
  role: z.enum(["MENTOR", "MENTEE", "ALL"]).optional().default("ALL"),
  status: mentorshipRequestStatusSchema.optional(),
  universityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const mentorshipDecisionSchema = z.object({
  note: z.string().trim().max(1000).optional().nullable(),
});

export const createMentorshipSessionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  notes: z.string().trim().max(3000).optional().nullable(),
  scheduledAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional().nullable(),
  meetingUrl: z.string().trim().url().optional().nullable(),
  status: mentorshipSessionStatusSchema.optional().default("SCHEDULED"),
});

export const updateMentorshipSessionSchema =
  createMentorshipSessionSchema.partial();
