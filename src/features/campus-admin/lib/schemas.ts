import { z } from "zod";

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

export const campusEntityStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const collegeInputSchema = z.object({
  name: z.string().trim().min(2, "College name is required."),
  shortName: z.string().trim().min(2, "Short name is required."),
  description: z.string().trim().min(10, "Add a short description."),
  logo: optionalImageReferenceSchema,
  status: campusEntityStatusSchema.default("ACTIVE"),
});

export const departmentInputSchema = z.object({
  collegeId: z.string().trim().min(1, "Select a college."),
  name: z.string().trim().min(2, "Department name is required."),
  code: z.string().trim().min(2, "Department code is required."),
  description: z.string().trim().min(10, "Add a short description."),
  status: campusEntityStatusSchema.default("ACTIVE"),
});

export const representativeInvitationInputSchema = z.object({
  collegeId: z.string().trim().min(1, "Select a college."),
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional().default(""),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
});

export const teacherInvitationInputSchema = z.object({
  departmentId: z.string().trim().min(1, "Select a department."),
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional().default(""),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
});

export type CollegeInput = z.infer<typeof collegeInputSchema>;
export type DepartmentInput = z.infer<typeof departmentInputSchema>;
export type RepresentativeInvitationInput = z.infer<
  typeof representativeInvitationInputSchema
>;
export type TeacherInvitationInput = z.infer<
  typeof teacherInvitationInputSchema
>;
