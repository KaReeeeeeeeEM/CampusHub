import { z } from "zod";

import { passwordSchema } from "@/features/auth/lib/schemas";

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || "")
  .pipe(z.union([z.literal(""), z.string().url("Enter a valid URL.")]));

const optionalImageReferenceSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || "")
  .pipe(
    z.union([
      z.literal(""),
      z.string().url("Enter a valid URL."),
      z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/i, {
        message: "Upload a PNG, JPG, or WEBP image.",
      }),
    ]),
  );

export const universityStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "ONBOARDING",
]);

export const universityInputSchema = z.object({
  name: z.string().trim().min(2, "University name is required."),
  shortName: z.string().trim().min(2, "Short name is required."),
  slug: z.string().trim().optional(),
  description: z.string().trim().min(20, "Add a short description."),
  logo: optionalImageReferenceSchema,
  coverImage: optionalImageReferenceSchema,
  country: z.string().trim().min(2, "Country is required."),
  region: z.string().trim().min(2, "Region is required."),
  website: optionalUrlSchema,
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "")
    .pipe(z.union([z.literal(""), z.string().email("Enter a valid email.")])),
  phone: z.string().trim().optional().default(""),
  status: universityStatusSchema.default("ACTIVE"),
});

export const campusAdminInvitationInputSchema = z.object({
  universityId: z.string().trim().min(1, "Select a university."),
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional().default(""),
  expiresInDays: z.coerce
    .number()
    .int()
    .min(1, "Expiry must be at least one day.")
    .max(90, "Expiry cannot exceed 90 days.")
    .default(14),
});

export const campusAdminActivationSchema = z
  .object({
    token: z.string().min(24, "Activation token is required."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type UniversityInput = z.infer<typeof universityInputSchema>;
export type CampusAdminInvitationInput = z.infer<
  typeof campusAdminInvitationInputSchema
>;
export type CampusAdminActivationInput = z.infer<
  typeof campusAdminActivationSchema
>;
