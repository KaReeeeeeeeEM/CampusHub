import { z } from "zod";

import { passwordSchema, userStatusSchema } from "@/features/auth/lib/schemas";
import {
  collegeInputSchema,
  departmentInputSchema,
} from "@/features/campus-admin/lib/schemas";
import { universityInputSchema } from "@/features/super-admin/lib/schemas";

export const teacherStatusSchema = z.enum([
  "ACTIVE",
  "SUSPENDED",
  "PENDING",
  "INACTIVE",
]);

export const createTeacherManagementSchema = z.object({
  staffId: z.string().trim().min(1, "Staff ID is required."),
  title: z.string().trim().min(2, "Title is required.").max(80),
  departmentId: z.string().trim().min(1, "Department is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional().default(""),
  username: z.string().trim().min(3).max(40).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  otherNames: z.string().trim().max(120).optional(),
  nickname: z.string().trim().max(60).optional(),
  password: passwordSchema.optional(),
  status: teacherStatusSchema.default("ACTIVE"),
});

export const updateTeacherManagementSchema = z.object({
  staffId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(2).max(80).optional(),
  departmentId: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  otherNames: z.string().trim().max(120).nullable().optional(),
  nickname: z.string().trim().max(60).nullable().optional(),
  status: teacherStatusSchema.optional(),
});

export const assignDepartmentSchema = z.object({
  departmentId: z.string().trim().min(1, "Department is required."),
});

export const representativeAssignmentSchema = z.object({
  userId: z.string().trim().min(1, "Student user is required."),
  collegeId: z.string().trim().min(1, "College is required."),
  title: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .default("College Representative"),
});

export const representativeTransferSchema = z.object({
  collegeId: z.string().trim().min(1, "College is required."),
  title: z.string().trim().min(2).max(100).optional(),
});

export const campusAdminAssignmentSchema = z.object({
  userId: z.string().trim().min(1, "User is required."),
});

export const listQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});

export { collegeInputSchema, departmentInputSchema, universityInputSchema };

export type CreateTeacherManagementInput = z.infer<
  typeof createTeacherManagementSchema
>;
export type UpdateTeacherManagementInput = z.infer<
  typeof updateTeacherManagementSchema
>;
export type RepresentativeAssignmentInput = z.infer<
  typeof representativeAssignmentSchema
>;
export type RepresentativeTransferInput = z.infer<
  typeof representativeTransferSchema
>;
export type CampusAdminAssignmentInput = z.infer<
  typeof campusAdminAssignmentSchema
>;
export type UserLifecycleStatusInput = z.infer<typeof userStatusSchema>;
