import { z } from "zod";

export const createInvitationSchema = z.object({
  universityId: z.string().min(1, "University is required."),
  collegeId: z.string().min(1, "College is required."),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  maxUsageCount: z.coerce.number().int().positive().optional(),
});

export const updateInvitationSchema = z.object({
  action: z.enum(["disable", "regenerate"]),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  maxUsageCount: z.coerce.number().int().positive().optional(),
});

export const studentInvitationRegistrationSchema = z
  .object({
    token: z.string().min(8, "Invitation token is required."),
    firstName: z.string().min(2, "Enter your first name."),
    lastName: z.string().min(2, "Enter your last name."),
    otherNames: z.string().max(100).optional(),
    nickname: z.string().max(60).optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username must be 32 characters or fewer.")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only use letters, numbers, and underscores.",
      ),
    email: z.string().email("Enter a valid email address."),
    department: z.string().min(2, "Enter your department."),
    yearOfStudy: z.string().min(1, "Select your year of study."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>;
export type StudentInvitationRegistrationInput = z.infer<
  typeof studentInvitationRegistrationSchema
>;
