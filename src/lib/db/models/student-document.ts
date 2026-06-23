import { model, models, Schema, type InferSchemaType } from "mongoose";

import { metadataField, tenantLifecycleFields } from "@/lib/db/models/model-helpers";

export const STUDENT_DOCUMENT_TYPES = [
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

export const STUDENT_DOCUMENT_VISIBILITY = [
  "PRIVATE",
  "UNIVERSITY",
  "EMPLOYERS",
  "LEADERSHIP",
] as const;

export const STUDENT_DOCUMENT_VERIFICATION_STATUSES = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

const studentDocumentSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    uploadedById: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    courseId: { type: String, default: null, index: true },
    title: { type: String, required: true, trim: true },
    documentType: {
      type: String,
      enum: STUDENT_DOCUMENT_TYPES,
      required: true,
      index: true,
    },
    customDocumentTypeName: { type: String, default: null, trim: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: null, trim: true },
    fileSize: { type: Number, default: null, min: 0 },
    issuingAuthority: { type: String, default: null, trim: true },
    referenceNumber: { type: String, default: null, trim: true },
    issuedAt: { type: Date, default: null, index: true },
    expiresAt: { type: Date, default: null, index: true },
    verificationStatus: {
      type: String,
      enum: STUDENT_DOCUMENT_VERIFICATION_STATUSES,
      default: "PENDING",
      index: true,
    },
    visibility: {
      type: String,
      enum: STUDENT_DOCUMENT_VISIBILITY,
      default: "PRIVATE",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    notes: { type: String, default: null, trim: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  {
    collection: "student_documents",
    timestamps: true,
  },
);

studentDocumentSchema.index({
  title: "text",
  fileName: "text",
  issuingAuthority: "text",
  referenceNumber: "text",
  notes: "text",
});
studentDocumentSchema.index({
  universityId: 1,
  userId: 1,
  status: 1,
  updatedAt: -1,
});

export type StudentDocumentRepositoryDocument = InferSchemaType<
  typeof studentDocumentSchema
>;

export const StudentDocumentModel =
  models.StudentDocument ||
  model<StudentDocumentRepositoryDocument>(
    "StudentDocument",
    studentDocumentSchema,
  );
