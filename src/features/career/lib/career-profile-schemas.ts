import { z } from "zod";

export const careerWorkTypeSchema = z.enum([
  "INTERNSHIP",
  "PART_TIME",
  "FULL_TIME",
  "FREELANCE",
  "VOLUNTEER",
]);

export const careerAvailabilityStatusSchema = z.enum([
  "AVAILABLE",
  "OPEN",
  "NOT_AVAILABLE",
]);

const urlSchema = z.string().trim().url();

export const careerCertificationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().max(160).optional().nullable(),
  issuedAt: z.string().trim().optional().nullable(),
  expiresAt: z.string().trim().optional().nullable(),
  credentialUrl: urlSchema.optional().nullable(),
});

export const careerExperienceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  organization: z.string().trim().max(160).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  startDate: z.string().trim().optional().nullable(),
  endDate: z.string().trim().optional().nullable(),
  current: z.coerce.boolean().optional().default(false),
  description: z.string().trim().max(2000).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(80)).optional().default([]),
});

export const careerEducationSchema = z.object({
  institution: z.string().trim().min(1).max(180),
  qualification: z.string().trim().max(180).optional().nullable(),
  fieldOfStudy: z.string().trim().max(180).optional().nullable(),
  startDate: z.string().trim().optional().nullable(),
  endDate: z.string().trim().optional().nullable(),
  description: z.string().trim().max(1200).optional().nullable(),
});

export const careerPortfolioLinkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: urlSchema,
  type: z
    .enum([
      "PORTFOLIO",
      "GITHUB",
      "LINKEDIN",
      "PROJECT",
      "PUBLICATION",
      "DESIGN",
      "OTHER",
    ])
    .optional()
    .default("OTHER"),
});

const careerProfileBaseSchema = z.object({
  headline: z.string().trim().min(1).max(180).optional().nullable(),
  bio: z.string().trim().max(3000).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(80)).optional().default([]),
  languages: z.array(z.string().trim().min(1).max(80)).optional().default([]),
  certifications: z.array(careerCertificationSchema).optional().default([]),
  experience: z.array(careerExperienceSchema).optional().default([]),
  education: z.array(careerEducationSchema).optional().default([]),
  portfolioLinks: z.array(careerPortfolioLinkSchema).optional().default([]),
  cvUrl: urlSchema.optional().nullable(),
  availabilityStatus: careerAvailabilityStatusSchema.optional().default("OPEN"),
  preferredWorkType: z.array(careerWorkTypeSchema).optional().default([]),
  preferredIndustries: z
    .array(z.string().trim().min(1).max(120))
    .optional()
    .default([]),
  graduationYear: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2200)
    .optional()
    .nullable(),
});

export const createCareerProfileSchema = careerProfileBaseSchema;

export const updateCareerProfileSchema = careerProfileBaseSchema.partial();

export const uploadCareerCvSchema = z.object({
  cvUrl: urlSchema,
});

export const addCareerSkillSchema = z.object({
  skill: z.string().trim().min(1).max(80),
});

export const addCareerCertificationSchema = z.object({
  certification: careerCertificationSchema,
});

export const addCareerExperienceSchema = z.object({
  experience: careerExperienceSchema,
});

export const addCareerPortfolioLinkSchema = z.object({
  portfolioLink: careerPortfolioLinkSchema,
});

export const careerProfileQuerySchema = z.object({
  includeProjects: z.coerce.boolean().optional().default(true),
  includeBadges: z.coerce.boolean().optional().default(true),
  includeAchievements: z.coerce.boolean().optional().default(true),
});

export type CareerWorkType = z.infer<typeof careerWorkTypeSchema>;
