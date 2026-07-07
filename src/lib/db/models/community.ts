import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import {
  attachmentSchema,
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const communitySchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: null, trim: true },
    coverImage: { type: String, default: null, trim: true },
    visibility: {
      type: String,
      enum: ["PUBLIC", "UNIVERSITY", "PRIVATE"],
      default: "UNIVERSITY",
      index: true,
    },
    ownerId: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    memberCount: { type: Number, default: 0, min: 0, index: true },
    moderatorCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "communities", timestamps: true },
);

const communityMemberSchema = new Schema(
  {
    _id: { type: String, required: true },
    communityId: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["OWNER", "MODERATOR", "MEMBER"],
      default: "MEMBER",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "LEFT", "REMOVED", "BLOCKED"],
      default: "ACTIVE",
      index: true,
    },
    joinedAt: { type: Date, default: Date.now, index: true },
    leftAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "community_members", timestamps: true },
);

const communityUpdateSchema = new Schema(
  {
    _id: { type: String, required: true },
    communityId: { type: String, required: true, index: true },
    universityId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    status: {
      type: String,
      enum: ["PUBLISHED", "ARCHIVED", "HIDDEN"],
      default: "PUBLISHED",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "community_updates", timestamps: true },
);

communitySchema.index({ universityId: 1, slug: 1 }, { unique: true });
communitySchema.index({ universityId: 1, visibility: 1, status: 1 });
communitySchema.index({ ownerId: 1, status: 1, createdAt: -1 });
communitySchema.index({ name: "text", description: "text" });
communityMemberSchema.index(
  { communityId: 1, userId: 1 },
  { unique: true },
);
communityMemberSchema.index({ userId: 1, status: 1, joinedAt: -1 });
communityMemberSchema.index({ communityId: 1, role: 1, status: 1 });
communityUpdateSchema.index({ communityId: 1, createdAt: -1 });
communityUpdateSchema.index({ universityId: 1, status: 1, createdAt: -1 });
communityUpdateSchema.index({ title: "text", content: "text" });

export type CommunityDocument = InferSchemaType<typeof communitySchema>;
export type CommunityMemberDocument = InferSchemaType<
  typeof communityMemberSchema
>;
export type CommunityUpdateDocument = InferSchemaType<
  typeof communityUpdateSchema
>;

export const CommunityModel =
  models.Community ||
  model<CommunityDocument>("Community", communitySchema);
export const CommunityMemberModel =
  models.CommunityMember ||
  model<CommunityMemberDocument>("CommunityMember", communityMemberSchema);
export const CommunityUpdateModel =
  models.CommunityUpdate ||
  model<CommunityUpdateDocument>("CommunityUpdate", communityUpdateSchema);
