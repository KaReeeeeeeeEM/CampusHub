import { z } from "zod";

export const opportunityWorkTypeSchema = z.enum([
  "INTERNSHIP",
  "PART_TIME",
  "FULL_TIME",
  "FREELANCE",
  "VOLUNTEER",
]);

export const opportunityStatusSchema = z.enum([
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
]);

export const opportunityLocationTypeSchema = z.enum([
  "ONSITE",
  "REMOTE",
  "HYBRID",
]);

export const salaryRangeSchema = z
  .object({
    min: z.coerce.number().min(0).optional().nullable(),
    max: z.coerce.number().min(0).optional().nullable(),
    currency: z.string().trim().min(3).max(3).optional().default("TZS"),
    period: z
      .enum(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"])
      .optional()
      .default("MONTH"),
    visible: z.coerce.boolean().optional().default(true),
  })
  .optional()
  .nullable()
  .refine(
    (value) =>
      !value ||
      value.min === undefined ||
      value.min === null ||
      value.max === undefined ||
      value.max === null ||
      value.max >= value.min,
    {
      message:
        "Maximum salary must be greater than or equal to minimum salary.",
    },
  );

const stringListSchema = z
  .array(z.string().trim().min(1).max(120))
  .optional()
  .default([]);

export const createOpportunitySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(20).max(10000),
  industry: z.string().trim().min(1).max(120),
  location: z.string().trim().max(180).optional().nullable(),
  locationType: opportunityLocationTypeSchema.optional().default("ONSITE"),
  workType: opportunityWorkTypeSchema,
  salaryRange: salaryRangeSchema,
  requirements: stringListSchema,
  skills: stringListSchema,
  applicationDeadline: z.coerce.date().optional().nullable(),
  applicationUrl: z.string().trim().url().optional().nullable(),
  applicationInstructions: z.string().trim().max(3000).optional().nullable(),
  targetColleges: stringListSchema,
  targetDepartments: stringListSchema,
  targetYears: stringListSchema,
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("PUBLISHED"),
});

export const updateOpportunitySchema = createOpportunitySchema
  .omit({ universityId: true })
  .partial();

export const opportunityQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  universityId: z.string().trim().min(1).optional(),
  employerId: z.string().trim().min(1).optional(),
  industry: z.string().trim().optional(),
  workType: opportunityWorkTypeSchema.optional(),
  locationType: opportunityLocationTypeSchema.optional(),
  status: opportunityStatusSchema.optional(),
  skills: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : value,
    z.array(z.string().trim().min(1)).optional().default([]),
  ),
  savedOnly: z.coerce.boolean().optional().default(false),
  includeArchived: z.coerce.boolean().optional().default(false),
  deadlineFrom: z.coerce.date().optional(),
  deadlineTo: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const saveOpportunitySchema = z.object({
  opportunityId: z.string().trim().min(1),
});

export const shareOpportunitySchema = z.object({
  channel: z
    .enum(["COPY_LINK", "EMAIL", "SOCIAL", "IN_APP", "OTHER"])
    .optional()
    .default("COPY_LINK"),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const opportunityViewTrackingSchema = z.object({
  source: z
    .enum(["DETAIL", "SEARCH", "FEED", "SHARE", "EMAIL", "RECOMMENDATION", "OTHER"])
    .optional()
    .default("DETAIL"),
  metadata: z.record(z.unknown()).optional().nullable(),
});
