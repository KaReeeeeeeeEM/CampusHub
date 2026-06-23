import { model, models, Schema, type InferSchemaType } from "mongoose";

import { tenantLifecycleFields } from "@/lib/db/models/model-helpers";

const courseSchema = new Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    durationYears: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      index: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    ...tenantLifecycleFields,
  },
  {
    collection: "course",
    timestamps: true,
  },
);

courseSchema.index({ universityId: 1, code: 1 }, { unique: true });
courseSchema.index({ universityId: 1, slug: 1 }, { unique: true });
courseSchema.index({ universityId: 1, departmentId: 1, status: 1 });
courseSchema.index({ universityId: 1, collegeId: 1, status: 1 });

export type CourseDocument = InferSchemaType<typeof courseSchema>;

export const CourseModel =
  models.Course || model<CourseDocument>("Course", courseSchema);
