import { z } from "zod";

export const suggestionCategorySchema = z.enum([
  "Academics",
  "Facilities",
  "Hostels",
  "Internet",
  "Library",
  "Health",
  "Administration",
  "Security",
  "Other",
]);

export const suggestionPrioritySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const suggestionStatusSchema = z.enum([
  "OPEN",
  "UNDER_REVIEW",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
]);

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(160),
  url: z.string().trim().url(),
  fileType: z.string().trim().max(80).optional().nullable(),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
});

export const createSuggestionSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(1).max(10000),
  category: suggestionCategorySchema,
  priority: suggestionPrioritySchema.default("MEDIUM"),
  anonymous: z.coerce.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const suggestionQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  category: suggestionCategorySchema.optional(),
  priority: suggestionPrioritySchema.optional(),
  status: suggestionStatusSchema.optional(),
  mine: z.coerce.boolean().optional().default(false),
  assignedToMe: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const suggestionCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  internal: z.coerce.boolean().optional().default(false),
});

export const assignSuggestionSchema = z.object({
  assignedTo: z.string().trim().min(1),
});

export const updateSuggestionStatusSchema = z.object({
  status: suggestionStatusSchema,
  response: z.string().trim().max(2000).optional().nullable(),
});

export const resolveSuggestionSchema = z.object({
  resolution: z.string().trim().min(1).max(3000),
});

export const rejectSuggestionSchema = z.object({
  reason: z.string().trim().min(1).max(3000),
});
