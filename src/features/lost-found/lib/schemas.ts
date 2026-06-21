import { z } from "zod";

export const lostFoundTypeSchema = z.enum(["Lost", "Found"]);
export const lostFoundStatusSchema = z.enum([
  "Open",
  "Matched",
  "Returned",
  "Under Review",
]);

export const createLostFoundItemSchema = z.object({
  title: z.string().trim().min(2, "Item title is required.").max(180),
  type: lostFoundTypeSchema.default("Lost"),
  category: z.string().trim().min(2, "Category is required.").max(80),
  status: lostFoundStatusSchema.default("Open"),
  location: z.string().trim().min(2, "Location is required.").max(240),
  description: z.string().trim().min(10, "Description is required.").max(4000),
  verification: z.string().trim().max(2000).optional().default(""),
  contact: z.string().trim().max(160).optional().default(""),
  images: z.array(z.string().trim().min(1)).max(4).optional().default([]),
});

export const updateLostFoundItemSchema = z.object({
  id: z.string().trim().min(1, "Item is required."),
  status: lostFoundStatusSchema,
});

export const archiveLostFoundItemSchema = z.object({
  id: z.string().trim().min(1, "Item is required."),
});

export const lostFoundQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  type: lostFoundTypeSchema.optional(),
  category: z.string().trim().optional(),
  status: lostFoundStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

export type CreateLostFoundItemInput = z.infer<
  typeof createLostFoundItemSchema
>;
