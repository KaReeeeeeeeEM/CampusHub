import { z } from "zod";

export const companySizeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const employerApplicationSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  industry: z.string().min(2, "Industry is required."),
  companySize: z.enum(companySizeOptions),
  website: z
    .string()
    .url("Enter a valid website URL.")
    .optional()
    .or(z.literal("")),
  contactPerson: z.string().min(2, "Contact person is required."),
  position: z.string().min(2, "Position is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(6, "Phone number is required."),
  country: z.string().min(2, "Country is required."),
  reasonForJoining: z
    .string()
    .min(20, "Reason should be at least 20 characters.")
    .max(1000, "Reason should be 1000 characters or fewer."),
});

export const employerApplicationReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNotes: z.string().max(1000).optional(),
});

export const employerActivationSchema = z
  .object({
    token: z.string().min(24, "Activation token is required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type EmployerApplicationInput = z.infer<
  typeof employerApplicationSchema
>;
export type EmployerApplicationReviewInput = z.infer<
  typeof employerApplicationReviewSchema
>;
export type EmployerActivationInput = z.infer<typeof employerActivationSchema>;
