import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import { metadataField } from "@/lib/db/models/model-helpers";

const networkConnectionSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, default: null, index: true },
    requesterId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "BLOCKED"],
      default: "PENDING",
      index: true,
    },
    respondedAt: { type: Date, default: null, index: true },
    respondedById: { type: String, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "network_connections", timestamps: true },
);

const networkFollowSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, default: null, index: true },
    followerId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ["USER", "PROJECT", "EMPLOYER", "ALUMNI", "UNIVERSITY"],
      required: true,
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "MUTED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
  },
  { collection: "network_follows", timestamps: true },
);

networkConnectionSchema.index(
  { requesterId: 1, receiverId: 1 },
  { unique: true },
);
networkConnectionSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
networkConnectionSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
networkConnectionSchema.index({ universityId: 1, status: 1, createdAt: -1 });
networkFollowSchema.index(
  { followerId: 1, entityType: 1, entityId: 1 },
  { unique: true },
);
networkFollowSchema.index({ entityType: 1, entityId: 1, status: 1 });
networkFollowSchema.index({ followerId: 1, status: 1, createdAt: -1 });
networkFollowSchema.index({ universityId: 1, entityType: 1, createdAt: -1 });

export type NetworkConnectionDocument = InferSchemaType<
  typeof networkConnectionSchema
>;
export type NetworkFollowDocument = InferSchemaType<
  typeof networkFollowSchema
>;

export const NetworkConnectionModel =
  models.NetworkConnection ||
  model<NetworkConnectionDocument>(
    "NetworkConnection",
    networkConnectionSchema,
  );
export const NetworkFollowModel =
  models.NetworkFollow ||
  model<NetworkFollowDocument>("NetworkFollow", networkFollowSchema);
