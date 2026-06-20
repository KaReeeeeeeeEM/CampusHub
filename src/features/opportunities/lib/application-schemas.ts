import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
  "HIRED",
  "WITHDRAWN",
]);

export const applyOpportunitySchema = z.object({
  cvUrl: z.string().trim().url().optional().nullable(),
  coverLetter: z.string().trim().max(5000).optional().nullable(),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(180),
        url: z.string().trim().url(),
        type: z.string().trim().max(80).optional().nullable(),
        size: z.coerce.number().int().min(0).optional().nullable(),
      }),
    )
    .optional()
    .default([]),
  answers: z.record(z.unknown()).optional().nullable(),
});

export const applicationQuerySchema = z.object({
  opportunityId: z.string().trim().min(1).optional(),
  studentId: z.string().trim().min(1).optional(),
  status: applicationStatusSchema.optional(),
  role: z.enum(["APPLICANT", "EMPLOYER", "ALL"]).optional().default("ALL"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const applicationReviewSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "SHORTLISTED",
    "INTERVIEW",
    "REJECTED",
    "HIRED",
  ]),
  note: z.string().trim().max(2000).optional().nullable(),
});

export const applicationTransitionNoteSchema = z.object({
  note: z.string().trim().max(2000).optional().nullable(),
});
