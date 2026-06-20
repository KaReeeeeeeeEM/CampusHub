import { z } from "zod";

export const communityVisibilitySchema = z.enum([
  "PUBLIC",
  "UNIVERSITY",
  "PRIVATE",
]);

export const communityStatusSchema = z.enum([
  "ACTIVE",
  "ARCHIVED",
  "SUSPENDED",
]);

export const communityMemberRoleSchema = z.enum([
  "OWNER",
  "MODERATOR",
  "MEMBER",
]);

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url(),
  fileType: z.string().trim().max(80).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
});

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(3000).optional().nullable(),
  coverImage: z.string().trim().url().optional().nullable(),
  visibility: communityVisibilitySchema.optional().default("UNIVERSITY"),
});

export const updateCommunitySchema = createCommunitySchema.partial().extend({
  status: communityStatusSchema.optional(),
});

export const communityQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  universityId: z.string().trim().min(1).optional(),
  visibility: communityVisibilitySchema.optional(),
  status: communityStatusSchema.optional(),
  mine: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const assignCommunityModeratorSchema = z.object({
  userId: z.string().trim().min(1),
});

export const createCommunityUpdateSchema = z.object({
  title: z.string().trim().min(3).max(180),
  content: z.string().trim().min(1).max(10000),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const communityUpdateQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const createCommunityEventSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().max(5000).optional().nullable(),
    eventType: z
      .enum([
        "ACADEMIC",
        "SPORTS",
        "CLUB",
        "WORKSHOP",
        "HACKATHON",
        "SEMINAR",
        "CAREER",
        "SOCIAL",
      ])
      .optional()
      .default("SOCIAL"),
    venue: z.string().trim().min(2).max(240),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    registrationDeadline: z.coerce.date().optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional().nullable(),
    allowWaitlist: z.coerce.boolean().optional().default(true),
    bannerImage: z.string().trim().url().optional().nullable(),
    attachments: z.array(attachmentSchema).optional().default([]),
    status: z
      .enum(["DRAFT", "OPEN", "FULL", "ONGOING", "COMPLETED", "CANCELLED"])
      .optional()
      .default("OPEN"),
  })
  .superRefine((value, ctx) => {
    if (value.endDate <= value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date.",
        path: ["endDate"],
      });
    }
    if (value.registrationDeadline && value.registrationDeadline > value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Registration deadline cannot be after the start date.",
        path: ["registrationDeadline"],
      });
    }
  });

const optionInputSchema = z.union([
  z.string().trim().min(1).max(180),
  z.object({
    id: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().min(1).max(180),
  }),
]);

export const createCommunityPollSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  pollType: z
    .enum(["GENERAL", "LEADERSHIP", "ACADEMIC", "EVENT", "SURVEY", "REFERENDUM"])
    .optional()
    .default("GENERAL"),
  options: z.array(optionInputSchema).min(2).max(20),
  allowMultipleSelection: z.coerce.boolean().optional().default(false),
  anonymous: z.coerce.boolean().optional().default(false),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional().default("ACTIVE"),
});
