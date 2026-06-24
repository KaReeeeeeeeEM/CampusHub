import { z } from "zod";

export const sponsorshipTypeSchema = z.enum([
  "SCHOLARSHIP",
  "PROJECT",
  "HACKATHON",
  "COMMUNITY",
  "RESEARCH",
]);

export const sponsorshipTargetEntityTypeSchema = z.enum([
  "NONE",
  "PROJECT",
  "EVENT",
  "COMMUNITY",
  "USER",
  "RESEARCH",
]);

export const sponsorshipStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "UNDER_REVIEW",
  "APPROVED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "ARCHIVED",
]);

export const sponsorshipInterestStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "DECLINED",
  "WITHDRAWN",
]);

const moneySchema = z
  .object({
    amount: z.coerce.number().min(0).optional().nullable(),
    currency: z.string().trim().min(3).max(3).optional().default("TZS"),
  })
  .optional()
  .nullable();

const sponsorshipBaseSchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  sponsorshipType: sponsorshipTypeSchema,
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(10000),
  targetEntityType: sponsorshipTargetEntityTypeSchema.optional().default("NONE"),
  targetEntityId: z.string().trim().min(1).optional().nullable(),
  sponsorId: z.string().trim().min(1).optional().nullable(),
  sponsorName: z.string().trim().max(180).optional().nullable(),
  requestedAmount: moneySchema,
  committedAmount: moneySchema,
  benefits: z.array(z.string().trim().min(1).max(200)).optional().default([]),
  eligibility: z.record(z.string(), z.unknown()).optional().nullable(),
  applicationDeadline: z.coerce.date().optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  visibility: z.enum(["PUBLIC", "UNIVERSITY", "PRIVATE"]).optional().default("UNIVERSITY"),
  status: sponsorshipStatusSchema.optional().default("DRAFT"),
});

export const createSponsorshipSchema = sponsorshipBaseSchema.superRefine(
  (value, ctx) => {
    if (value.targetEntityType !== "NONE" && !value.targetEntityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target entity is required for this sponsorship type.",
        path: ["targetEntityId"],
      });
    }
    if (value.targetEntityType === "NONE" && value.targetEntityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target entity type is required when target entity is provided.",
        path: ["targetEntityType"],
      });
    }
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date.",
        path: ["endsAt"],
      });
    }
  },
);

export const updateSponsorshipSchema = sponsorshipBaseSchema
  .omit({ universityId: true })
  .partial();

export const sponsorshipQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  universityId: z.string().trim().min(1).optional(),
  sponsorshipType: sponsorshipTypeSchema.optional(),
  targetEntityType: sponsorshipTargetEntityTypeSchema.optional(),
  targetEntityId: z.string().trim().min(1).optional(),
  sponsorId: z.string().trim().min(1).optional(),
  requestedById: z.string().trim().min(1).optional(),
  status: sponsorshipStatusSchema.optional(),
  mine: z.coerce.boolean().optional().default(false),
  includePrivate: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const submitSponsorshipInterestSchema = z.object({
  sponsorName: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  proposedAmount: moneySchema,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const sponsorshipInterestQuerySchema = z.object({
  sponsorshipId: z.string().trim().min(1).optional(),
  sponsorId: z.string().trim().min(1).optional(),
  status: sponsorshipInterestStatusSchema.optional(),
  universityId: z.string().trim().min(1).optional(),
  mine: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const reviewSponsorshipInterestSchema = z.object({
  note: z.string().trim().max(1000).optional().nullable(),
});

export type SponsorshipTargetEntityType = z.infer<
  typeof sponsorshipTargetEntityTypeSchema
>;
