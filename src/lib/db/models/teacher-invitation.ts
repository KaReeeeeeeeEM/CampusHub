import { model, models, Schema, type InferSchemaType } from "mongoose";

const teacherInvitationSchema = new Schema(
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
    departmentId: {
      type: String,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
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
    collection: "teacherInvitation",
    timestamps: true,
  },
);

export type TeacherInvitationDocument = InferSchemaType<
  typeof teacherInvitationSchema
>;

export const TeacherInvitationModel =
  models.TeacherInvitation ||
  model<TeacherInvitationDocument>(
    "TeacherInvitation",
    teacherInvitationSchema,
  );
