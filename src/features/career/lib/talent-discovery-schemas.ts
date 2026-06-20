import { z } from "zod";

import {
  careerAvailabilityStatusSchema,
  careerWorkTypeSchema,
} from "@/features/career/lib/career-profile-schemas";

function csv(value: string | undefined) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

const csvStringArray = z.preprocess(
  (value) => (typeof value === "string" ? csv(value) : value),
  z.array(z.string().trim().min(1)).optional().default([]),
);

export const talentDiscoveryQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  skills: csvStringArray,
  projectSkills: csvStringArray,
  projectCategories: csvStringArray,
  projectQuery: z.string().trim().optional().default(""),
  badgeIds: csvStringArray,
  badgeCategories: csvStringArray,
  minXp: z.coerce.number().int().min(0).optional(),
  minLevel: z.coerce.number().int().min(1).optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2200).optional(),
  minExperienceCount: z.coerce.number().int().min(0).optional(),
  availabilityStatus: careerAvailabilityStatusSchema.optional(),
  preferredWorkType: careerWorkTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const saveCandidateSchema = z.object({
  candidateUserId: z.string().trim().min(1),
  opportunityId: z.string().trim().min(1).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const savedCandidateQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  opportunityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const contactCandidateSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  message: z.string().trim().min(1).max(3000),
  opportunityId: z.string().trim().min(1).optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable(),
});
