import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

export const INVITATION_TYPES = [
  "STUDENT_INVITATION",
  "REPRESENTATIVE_INVITATION",
  "TEACHER_INVITATION",
  "CAMPUS_ADMIN_INVITATION",
] as const;

export const INVITATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;

const invitationSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: INVITATION_TYPES,
      required: true,
      index: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },
    universityId: {
      type: String,
      required: true,
      index: true,
    },
    collegeId: {
      type: String,
      default: null,
      index: true,
    },
    departmentId: {
      type: String,
      default: null,
      index: true,
    },
    courseId: {
      type: String,
      default: null,
      index: true,
    },
    yearOfStudy: {
      type: Number,
      default: null,
      min: 1,
      max: 8,
      index: true,
    },
    enrollmentYear: {
      type: Number,
      default: null,
      index: true,
    },
    expectedGraduationYear: {
      type: Number,
      default: null,
      index: true,
    },
    representativeId: {
      type: String,
      default: null,
      index: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    position: {
      type: String,
      enum: ["NONE", "REPRESENTATIVE", "COMMITTEE_MEMBER"],
      default: "NONE",
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: String,
      default: null,
    },
    acceptedBy: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: INVITATION_STATUSES,
      default: "PENDING",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    collection: "invitations",
    timestamps: true,
  },
);

invitationSchema.index({ token: 1, status: 1 });
invitationSchema.index({ universityId: 1, type: 1, status: 1 });
invitationSchema.index({ universityId: 1, collegeId: 1, status: 1 });
invitationSchema.index({ universityId: 1, departmentId: 1, status: 1 });
invitationSchema.index(
  { email: 1, type: 1, status: 1 },
  { partialFilterExpression: { email: { $type: "string" } } },
);

export type InvitationDocument = InferSchemaType<typeof invitationSchema>;

export const InvitationModel =
  models.Invitation ||
  model<InvitationDocument>("Invitation", invitationSchema);
