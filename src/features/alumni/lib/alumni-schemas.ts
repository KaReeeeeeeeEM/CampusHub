import { z } from "zod";

export const alumniVisibilitySchema = z.enum([
  "PUBLIC",
  "UNIVERSITY",
  "COLLEGE",
  "PRIVATE",
]);

const nullableUrlSchema = z
  .string()
  .trim()
  .url()
  .optional()
  .nullable();

const alumniProfileBaseSchema = z.object({
  graduationYear: z.coerce.number().int().min(1900).max(2200),
  degree: z.string().trim().min(2).max(180),
  collegeId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  currentCompany: z.string().trim().max(180).optional().nullable(),
  currentPosition: z.string().trim().max(180).optional().nullable(),
  industry: z.string().trim().max(140).optional().nullable(),
  location: z.string().trim().max(180).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(3000).optional().nullable(),
  linkedinUrl: nullableUrlSchema,
  portfolioUrl: nullableUrlSchema,
  visibility: alumniVisibilitySchema.optional().default("UNIVERSITY"),
});

export const createAlumniProfileSchema = alumniProfileBaseSchema;

export const updateAlumniProfileSchema = alumniProfileBaseSchema.partial();

export const alumniSearchQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  universityId: z.string().trim().min(1).optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2200).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  industry: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).optional(),
  company: z.string().trim().min(1).optional(),
  position: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const alumniConnectionRequestSchema = z.object({
  message: z.string().trim().max(500).optional().nullable(),
});

export const alumniConnectionResponseSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "BLOCKED"]),
});

export const alumniAnalyticsQuerySchema = z.object({
  universityId: z.string().trim().min(1).optional(),
  collegeId: z.string().trim().min(1).optional(),
  departmentId: z.string().trim().min(1).optional(),
  graduationYear: z.coerce.number().int().min(1900).max(2200).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type AlumniVisibility = z.infer<typeof alumniVisibilitySchema>;
