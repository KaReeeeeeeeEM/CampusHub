import { z } from "zod";

export const studentDocumentTypes = [
  "CV",
  "NATIONAL_ID",
  "O_LEVEL_CERTIFICATE",
  "A_LEVEL_CERTIFICATE",
  "TRANSCRIPT",
  "ADMISSION_LETTER",
  "BIRTH_CERTIFICATE",
  "PASSPORT",
  "OTHER",
] as const;

export const studentDocumentVisibilityValues = [
  "PRIVATE",
  "UNIVERSITY",
  "EMPLOYERS",
  "LEADERSHIP",
] as const;

export const studentDocumentVerificationStatuses = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

const optionalText = z
  .string()
  .trim()
  .max(240)
  .optional()
  .default("");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: "Use a valid date.",
  });

const studentDocumentPayloadSchema = z.object({
  title: z.string().trim().min(2, "Document title is required.").max(180),
  documentType: z.enum(studentDocumentTypes).default("CV"),
  customDocumentTypeName: z
    .string()
    .trim()
    .max(120, "Custom document name must be 120 characters or fewer.")
    .optional()
    .default(""),
  fileName: z.string().trim().min(1, "Choose a document file.").max(240),
  fileUrl: z.string().trim().min(1, "Choose a document file."),
  fileType: z.string().trim().max(160).optional().default(""),
  fileSize: z.coerce.number().int().min(0).max(5 * 1024 * 1024),
  visibility: z.enum(studentDocumentVisibilityValues).default("PRIVATE"),
  issuingAuthority: optionalText,
  referenceNumber: optionalText,
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  notes: z.string().trim().max(1200).optional().default(""),
});

function requireOtherDocumentName(
  value: { documentType?: string; customDocumentTypeName?: string },
  context: z.RefinementCtx,
) {
    if (value.documentType === "OTHER" && !value.customDocumentTypeName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name the academic document type.",
        path: ["customDocumentTypeName"],
      });
    }
}

export const createStudentDocumentSchema =
  studentDocumentPayloadSchema.superRefine(requireOtherDocumentName);

export const updateStudentDocumentSchema =
  studentDocumentPayloadSchema
    .partial()
    .extend({
      id: z.string().trim().min(1, "Document is required."),
    })
    .superRefine(requireOtherDocumentName);

export const archiveStudentDocumentSchema = z.object({
  id: z.string().trim().min(1, "Document is required."),
});

export const studentDocumentQuerySchema = z.object({
  q: z.string().trim().optional().default(""),
  documentType: z.enum(studentDocumentTypes).optional(),
  verificationStatus: z.enum(studentDocumentVerificationStatuses).optional(),
  visibility: z.enum(studentDocumentVisibilityValues).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
});

export type CreateStudentDocumentInput = z.infer<
  typeof createStudentDocumentSchema
>;
export type UpdateStudentDocumentInput = z.infer<
  typeof updateStudentDocumentSchema
>;
