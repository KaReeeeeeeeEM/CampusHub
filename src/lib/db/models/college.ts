import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import { tenantLifecycleFields } from "@/lib/db/models/model-helpers";

const collegeSchema = new Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    shortName: {
      type: String,
      default: null,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    logo: {
      type: String,
      default: null,
      trim: true,
    },
    deanUserId: {
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
    collection: "college",
    timestamps: true,
  },
);

collegeSchema.index({ universityId: 1, slug: 1 }, { unique: true });
collegeSchema.index(
  { universityId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: "string" } } },
);
collegeSchema.index({ universityId: 1, status: 1, deletedAt: 1 });

export type CollegeDocument = InferSchemaType<typeof collegeSchema>;

export const CollegeModel =
  models.College || model<CollegeDocument>("College", collegeSchema);
