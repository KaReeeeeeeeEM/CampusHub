import { z } from "zod";

export const networkConnectionStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "BLOCKED",
]);

export const networkFollowEntityTypeSchema = z.enum([
  "USER",
  "PROJECT",
  "EMPLOYER",
  "ALUMNI",
  "UNIVERSITY",
]);

export const createNetworkConnectionSchema = z.object({
  receiverId: z.string().trim().min(1),
  message: z.string().trim().max(500).optional().nullable(),
});

export const networkConnectionResponseSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "BLOCKED"]),
});

export const networkConnectionQuerySchema = z.object({
  status: networkConnectionStatusSchema.optional(),
  role: z.enum(["REQUESTER", "RECEIVER", "ALL"]).optional().default("ALL"),
  universityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export const createNetworkFollowSchema = z.object({
  entityType: networkFollowEntityTypeSchema,
  entityId: z.string().trim().min(1),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const networkFollowQuerySchema = z.object({
  entityType: networkFollowEntityTypeSchema.optional(),
  entityId: z.string().trim().min(1).optional(),
  universityId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  cursor: z.string().trim().optional(),
});

export type NetworkFollowEntityType = z.infer<
  typeof networkFollowEntityTypeSchema
>;
