import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

export const EMPLOYER_APPLICATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;

const employerApplicationSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    companySize: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      default: null,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    reasonForJoining: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: EMPLOYER_APPLICATION_STATUSES,
      default: "PENDING",
      index: true,
    },
    reviewNotes: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedByUserId: {
      type: String,
      default: null,
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    activationTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    activationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    activationInvitationSentAt: {
      type: Date,
      default: null,
    },
    activationUsedAt: {
      type: Date,
      default: null,
    },
    employerUserId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    collection: "employerApplication",
    timestamps: true,
  },
);

export type EmployerApplicationDocument = InferSchemaType<
  typeof employerApplicationSchema
>;

export const EmployerApplicationModel =
  models.EmployerApplication ||
  model<EmployerApplicationDocument>(
    "EmployerApplication",
    employerApplicationSchema,
  );
