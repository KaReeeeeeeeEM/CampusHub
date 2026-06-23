import { model, models, Schema, type InferSchemaType } from "mongoose";

const joinInvitationSchema = new Schema(
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
      enum: ["STUDENT", "TEACHER", "ALUMNI", "EMPLOYER", "CAMPUS_ADMIN"],
      default: "STUDENT",
      index: true,
    },
    universityId: {
      type: String,
      required: true,
      index: true,
    },
    collegeId: {
      type: String,
      required: true,
      index: true,
    },
    departmentId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    yearOfStudy: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    enrollmentYear: {
      type: Number,
      required: true,
      index: true,
    },
    expectedGraduationYear: {
      type: Number,
      required: true,
      index: true,
    },
    representativeId: {
      type: String,
      required: true,
      index: true,
    },
    createdByUserId: {
      type: String,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    maxUsageCount: {
      type: Number,
      default: null,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    regeneratedFromInvitationId: {
      type: String,
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "joinInvitation",
    timestamps: true,
  },
);

export type JoinInvitationDocument = InferSchemaType<
  typeof joinInvitationSchema
>;

export const JoinInvitationModel =
  models.JoinInvitation ||
  model<JoinInvitationDocument>("JoinInvitation", joinInvitationSchema);
