import { z } from "zod";

import { passwordSchema } from "@/features/auth/lib/schemas";

export const superAdminBootstrapSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(80, "First name must be 80 characters or fewer."),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(80, "Last name must be 80 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export type SuperAdminBootstrapInput = z.infer<
  typeof superAdminBootstrapSchema
>;
