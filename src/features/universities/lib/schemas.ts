import { z } from "zod";

export const requestUniversitySchema = z.object({
  universityName: z.string().min(3, "Enter the university name."),
  country: z.string().min(2, "Enter the country."),
  city: z.string().min(2, "Enter the city."),
  website: z
    .string()
    .url("Enter a valid website URL.")
    .optional()
    .or(z.literal("")),
  requesterName: z.string().min(2, "Enter your name."),
  requesterEmail: z.string().email("Enter a valid email address."),
  relationship: z.string().min(1, "Select your relationship."),
  notes: z
    .string()
    .max(700, "Notes must be 700 characters or fewer.")
    .optional(),
});

export type RequestUniversityInput = z.infer<typeof requestUniversitySchema>;
