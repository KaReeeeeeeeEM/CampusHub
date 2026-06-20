import { z } from "zod";

export const pollTypeSchema = z.enum([
  "GENERAL",
  "LEADERSHIP",
  "ACADEMIC",
  "EVENT",
  "SURVEY",
  "REFERENDUM",
]);

export const pollVisibilitySchema = z.enum([
  "UNIVERSITY",
  "COLLEGE",
  "DEPARTMENT",
  "CUSTOM",
]);

export const pollStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "CLOSED",
  "ARCHIVED",
]);

const optionInputSchema = z.union([
  z.string().trim().min(1).max(180),
  z.object({
    id: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().min(1).max(180),
  }),
]);

export const createPollSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().max(2000).optional().nullable(),
  pollType: pollTypeSchema.default("GENERAL"),
  options: z.array(optionInputSchema).min(2).max(20),
  visibility: pollVisibilitySchema.default("UNIVERSITY"),
  collegeIds: z.array(z.string().trim().min(1)).optional().default([]),
  departmentIds: z.array(z.string().trim().min(1)).optional().default([]),
  customAudience: z.array(z.string().trim().min(1)).optional().default([]),
  allowMultipleSelection: z.coerce.boolean().optional().default(false),
  anonymous: z.coerce.boolean().optional().default(false),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date(),
  status: pollStatusSchema.default("ACTIVE"),
});

export const updatePollSchema = createPollSchema.partial().extend({
  options: z.array(optionInputSchema).min(2).max(20).optional(),
});

export const pollQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  pollType: pollTypeSchema.optional(),
  visibility: pollVisibilitySchema.optional(),
  status: pollStatusSchema.optional(),
  mine: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const votePollSchema = z.object({
  selectedOptions: z.array(z.string().trim().min(1)).min(1),
});

export const closePollSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;
