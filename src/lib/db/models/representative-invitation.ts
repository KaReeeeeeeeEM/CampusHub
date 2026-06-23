import { model, models, Schema, type InferSchemaType } from "mongoose";

const representativeInvitationSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
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
    firstName: {
      type: String,
      default: null,
      trim: true,
    },
    lastName: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["SENT", "ACCEPTED", "EXPIRED", "DISABLED"],
      default: "SENT",
      index: true,
    },
    invitationToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    invitedByUserId: {
      type: String,
      required: true,
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "representativeInvitation",
    timestamps: true,
  },
);

export type RepresentativeInvitationDocument = InferSchemaType<
  typeof representativeInvitationSchema
>;

export const RepresentativeInvitationModel =
  models.RepresentativeInvitation ||
  model<RepresentativeInvitationDocument>(
    "RepresentativeInvitation",
    representativeInvitationSchema,
  );
