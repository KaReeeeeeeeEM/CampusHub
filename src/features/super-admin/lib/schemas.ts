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

const optionalCoordinateSchema = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.coerce.number().min(min, message).max(max, message).nullable().default(null),
  );

export const universityStatusSchema = z.enum(["ACTIVE", "INACTIVE", "PENDING"]);

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
  locationName: z.string().trim().optional().default(""),
  locationAddress: z.string().trim().optional().default(""),
  locationLatitude: optionalCoordinateSchema(
    -90,
    90,
    "Latitude must be between -90 and 90.",
  ),
  locationLongitude: optionalCoordinateSchema(
    -180,
    180,
    "Longitude must be between -180 and 180.",
  ),
  status: universityStatusSchema.default("ACTIVE"),
});

export const campusAdminInvitationInputSchema = z.object({
  universityId: z.string().trim().min(1, "Select a university."),
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
    firstName: z.string().trim().min(2, "First name is required."),
    lastName: z.string().trim().min(2, "Last name is required."),
    email: z.string().trim().email("Enter a valid email."),
    phone: z.string().trim().optional().default(""),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const superAdminCampusEntityStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

const optionalCollegeCodeSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0
      ? undefined
      : value,
  z.string().trim().min(2, "College code is required.").optional(),
);

export const superAdminCollegeInputSchema = z.object({
  universityId: z.string().trim().min(1, "Select a university."),
  name: z.string().trim().min(2, "College name is required."),
  shortName: z.string().trim().min(2, "Short name is required."),
  code: optionalCollegeCodeSchema,
  description: z.string().trim().min(10, "Add a short description."),
  logo: optionalImageReferenceSchema,
  status: superAdminCampusEntityStatusSchema.default("ACTIVE"),
});

export const superAdminDepartmentInputSchema = z.object({
  universityId: z.string().trim().min(1, "Select a university."),
  collegeId: z.string().trim().min(1, "Select a college."),
  name: z.string().trim().min(2, "Department name is required."),
  code: z.string().trim().min(2, "Department code is required."),
  description: z.string().trim().min(10, "Add a short description."),
  status: superAdminCampusEntityStatusSchema.default("ACTIVE"),
});

export type UniversityInput = z.infer<typeof universityInputSchema>;
export type CampusAdminInvitationInput = z.infer<
  typeof campusAdminInvitationInputSchema
>;
export type CampusAdminActivationInput = z.infer<
  typeof campusAdminActivationSchema
>;
export type SuperAdminCollegeInput = z.infer<
  typeof superAdminCollegeInputSchema
>;
export type SuperAdminDepartmentInput = z.infer<
  typeof superAdminDepartmentInputSchema
>;
