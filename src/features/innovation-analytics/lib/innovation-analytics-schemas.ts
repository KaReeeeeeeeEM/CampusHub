import { z } from "zod";

export const innovationAnalyticsQuerySchema = z
  .object({
    universityId: z.string().trim().min(1).optional(),
    collegeId: z.string().trim().min(1).optional(),
    departmentId: z.string().trim().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.to < value.from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date range end must be after the start date.",
        path: ["to"],
      });
    }
  });
