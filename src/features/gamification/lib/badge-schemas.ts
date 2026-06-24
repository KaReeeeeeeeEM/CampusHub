import { z } from "zod";

export const badgeRaritySchema = z.enum([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
]);

export const badgeStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const createBadgeSchema = z.object({
  universityId: z.string().trim().min(1).optional().nullable(),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  icon: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().min(1).max(80),
  rarity: badgeRaritySchema.default("COMMON"),
  xpReward: z.coerce.number().int().min(0).max(10000).optional().default(0),
  criteria: z.record(z.string(), z.unknown()),
  isGlobal: z.coerce.boolean().optional().default(false),
  status: badgeStatusSchema.optional().default("ACTIVE"),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const listBadgesQuerySchema = z.object({
  q: z.string().trim().optional(),
  universityId: z.string().trim().min(1).optional(),
  category: z.string().trim().optional(),
  rarity: badgeRaritySchema.optional(),
  status: badgeStatusSchema.optional().default("ACTIVE"),
  includeGlobal: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

export const earnBadgeSchema = z
  .object({
    userId: z.string().trim().min(1),
    badgeId: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).max(120).optional().nullable(),
    displayOnProfile: z.coerce.boolean().optional().default(true),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })
  .refine((value) => Boolean(value.badgeId) || Boolean(value.slug), {
    message: "Either badgeId or slug is required.",
    path: ["badgeId"],
  });

export const userBadgeQuerySchema = z.object({
  userId: z.string().trim().min(1).optional(),
  category: z.string().trim().optional(),
  rarity: badgeRaritySchema.optional(),
  displayOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().trim().optional(),
});

export const updateUserBadgeDisplaySchema = z.object({
  displayOnProfile: z.coerce.boolean(),
});

export type BadgeRarityInput = z.infer<typeof badgeRaritySchema>;
export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;
export type ListBadgesQueryInput = z.infer<typeof listBadgesQuerySchema>;
export type EarnBadgeInput = z.infer<typeof earnBadgeSchema>;
export type UserBadgeQueryInput = z.infer<typeof userBadgeQuerySchema>;
export type UpdateUserBadgeDisplayInput = z.infer<
  typeof updateUserBadgeDisplaySchema
>;
