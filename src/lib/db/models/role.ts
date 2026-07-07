import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

const roleSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    system: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    collection: "role",
    timestamps: true,
  },
);

export type RoleDocument = InferSchemaType<typeof roleSchema>;

export const RoleModel = models.Role || model<RoleDocument>("Role", roleSchema);
