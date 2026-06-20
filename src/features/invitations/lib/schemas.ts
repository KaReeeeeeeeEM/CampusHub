import { z } from "zod";

import { passwordSchema } from "@/features/auth/lib/schemas";

export const invitationTypeSchema = z.enum([
  "STUDENT_INVITATION",
  "REPRESENTATIVE_INVITATION",
  "TEACHER_INVITATION",
  "CAMPUS_ADMIN_INVITATION",
]);

export const invitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
]);

export const createStudentInvitationSchema = z.object({
  universityId: z.string().min(1),
  collegeId: z.string().min(1),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
});

export const createRepresentativeInvitationSchema = z.object({
  email: z.string().email(),
  universityId: z.string().min(1),
  collegeId: z.string().min(1),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
});

export const createCampusAdminInvitationSchema = z.object({
  email: z.string().email(),
  universityId: z.string().min(1),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
});

export const acceptStudentInvitationSchema = z
  .object({
    token: z.string().min(24),
    username: z
      .string()
      .min(3)
      .max(40)
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Username can only include letters, numbers, underscores, dots, and hyphens.",
      )
      .transform((value) => value.toLowerCase()),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    otherNames: z.string().max(120).optional(),
    nickname: z.string().max(60).optional(),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const acceptInvitedAccountSchema = z
  .object({
    token: z.string().min(24),
    username: z
      .string()
      .min(3)
      .max(40)
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Username can only include letters, numbers, underscores, dots, and hyphens.",
      )
      .transform((value) => value.toLowerCase()),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    otherNames: z.string().max(120).optional(),
    nickname: z.string().max(60).optional(),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const revokeInvitationSchema = z.object({
  invitationId: z.string().min(1),
});

export type CreateStudentInvitationInput = z.infer<
  typeof createStudentInvitationSchema
>;
export type CreateRepresentativeInvitationInput = z.infer<
  typeof createRepresentativeInvitationSchema
>;
export type CreateCampusAdminInvitationInput = z.infer<
  typeof createCampusAdminInvitationSchema
>;
export type AcceptStudentInvitationInput = z.infer<
  typeof acceptStudentInvitationSchema
>;
export type AcceptInvitedAccountInput = z.infer<
  typeof acceptInvitedAccountSchema
>;
