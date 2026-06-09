import { z } from "zod";

import {
  ONBOARDING_ROLES,
  type OnboardingData,
} from "@/features/onboarding/lib/types";

export const onboardingStepSchema = z.enum([
  "role",
  "details",
  "review",
  "complete",
]);

export const onboardingRoleSchema = z.enum(ONBOARDING_ROLES);

const studentSchema = z.object({
  university: z.string(),
  college: z.string(),
  department: z.string(),
  year: z.string(),
});

const teacherSchema = z.object({
  university: z.string(),
  department: z.string(),
});

const representativeSchema = z.object({
  university: z.string(),
  college: z.string(),
  committeeCategory: z.string(),
});

const campusAdminSchema = z.object({
  university: z.string(),
  administrativeUnit: z.string(),
  position: z.string(),
});

const alumniSchema = z.object({
  graduationYear: z.string(),
  currentEmployer: z.string(),
  position: z.string(),
});

const employerSchema = z.object({
  company: z.string(),
  industry: z.string(),
  companySize: z.string(),
});

export const onboardingDataSchema = z.object({
  STUDENT: studentSchema,
  TEACHER: teacherSchema,
  REPRESENTATIVE: representativeSchema,
  CAMPUS_ADMIN: campusAdminSchema,
  ALUMNI: alumniSchema,
  EMPLOYER: employerSchema,
}) satisfies z.ZodType<OnboardingData>;

export const saveOnboardingSchema = z.object({
  role: onboardingRoleSchema.nullable(),
  currentStep: onboardingStepSchema,
  data: onboardingDataSchema,
  completed: z.boolean().default(false),
});

export const completeOnboardingSchema = saveOnboardingSchema
  .extend({
    role: onboardingRoleSchema,
    currentStep: z.literal("complete").default("complete"),
    completed: z.literal(true).default(true),
  })
  .superRefine((value, context) => {
    const roleData = value.data[value.role];

    Object.entries(roleData).forEach(([field, fieldValue]) => {
      if (!String(fieldValue).trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} is required.`,
          path: ["data", value.role, field],
        });
      }
    });
  });

export type SaveOnboardingInput = z.infer<typeof saveOnboardingSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
