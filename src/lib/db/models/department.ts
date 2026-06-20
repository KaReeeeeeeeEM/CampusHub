import { model, models, Schema, type InferSchemaType } from "mongoose";

import { tenantLifecycleFields } from "@/lib/db/models/model-helpers";

const departmentSchema = new Schema(
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
    },
    slug: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      index: true,
    },
    headUserId: {
      type: String,
      default: null,
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
    collection: "department",
    timestamps: true,
  },
);

departmentSchema.index({ universityId: 1, code: 1 }, { unique: true });
departmentSchema.index({ collegeId: 1, status: 1 });
departmentSchema.index(
  { universityId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $type: "string" } } },
);
departmentSchema.index({ universityId: 1, collegeId: 1, status: 1 });
departmentSchema.index({ universityId: 1, status: 1, deletedAt: 1 });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema>;

export const DepartmentModel =
  models.Department ||
  model<DepartmentDocument>("Department", departmentSchema);
