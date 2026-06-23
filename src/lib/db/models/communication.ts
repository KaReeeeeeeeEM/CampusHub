import { model, models, Schema, type InferSchemaType } from "mongoose";

import { metadataField } from "@/lib/db/models/model-helpers";

const notificationSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, default: null, index: true },
    recipientId: { type: String, required: true, index: true },
    actorId: { type: String, default: null, index: true },
    senderId: { type: String, default: null, index: true },
    category: {
      type: String,
      enum: [
        "ANNOUNCEMENT",
        "RECOMMENDATION",
        "COMMUNITY",
        "EVENT",
        "FORUM",
        "POLL",
        "MARKETPLACE",
        "SHOWCASE",
        "OPPORTUNITY",
        "EMPLOYER",
        "GOVERNANCE",
        "MENTORSHIP",
        "GAMIFICATION",
        "SYSTEM",
        "MODERATION",
      ],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "ANNOUNCEMENT",
        "RECOMMENDATION",
        "COMMUNITY",
        "EVENT",
        "EVENT_REMINDER",
        "ALMANAC_REMINDER",
        "POLL",
        "FORUM",
        "SUGGESTION",
        "PROJECT",
        "PROJECT_STAR",
        "PROJECT_COMMENT",
        "MARKETPLACE",
        "ORDER",
        "MENTORSHIP",
        "OPPORTUNITY",
        "EMPLOYER",
        "GOVERNANCE",
        "BADGE",
        "STREAK_REMINDER",
        "XP",
        "SYSTEM",
      ],
      required: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: null, trim: true },
    message: { type: String, required: true, trim: true },
    entityType: { type: String, default: null, trim: true, index: true },
    entityId: { type: String, default: null, index: true },
    actionUrl: { type: String, default: null, trim: true },
    image: { type: String, default: null, trim: true },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
      index: true,
    },
    status: {
      type: String,
      enum: ["UNREAD", "READ", "ARCHIVED"],
      default: "UNREAD",
      index: true,
    },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
    },
    readAt: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null, index: true },
    deliveredAt: { type: Date, default: null, index: true },
    expiresAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
    deletedById: { type: String, default: null },
    metadata: metadataField,
  },
  { collection: "notifications", timestamps: true },
);

const activityFeedSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    actorId: { type: String, default: null, index: true },
    actorType: { type: String, default: null, trim: true, index: true },
    actorSnapshot: { type: Schema.Types.Mixed, default: null },
    verb: { type: String, required: true, trim: true, index: true },
    activityType: {
      type: String,
      enum: [
        "ANNOUNCEMENT_CREATED",
        "EVENT_CREATED",
        "EVENT_JOINED",
        "POLL_CREATED",
        "FORUM_POST",
        "PROJECT_CREATED",
        "PROJECT_STARRED",
        "PRODUCT_CREATED",
        "ORDER_CREATED",
        "BADGE_EARNED",
        "XP_EARNED",
        "ACHIEVEMENT_COMPLETED",
        "MENTORSHIP_STARTED",
        "OPPORTUNITY_POSTED",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, index: true },
    image: { type: String, default: null, trim: true },
    visibility: {
      type: String,
      enum: ["PUBLIC", "UNIVERSITY", "COLLEGE", "DEPARTMENT", "PRIVATE"],
      default: "UNIVERSITY",
      index: true,
    },
    entitySnapshot: { type: Schema.Types.Mixed, default: null },
    targetType: { type: String, default: null, trim: true, index: true },
    targetId: { type: String, default: null, index: true },
    category: {
      type: String,
      enum: [
        "ACADEMIC",
        "SOCIAL",
        "MARKETPLACE",
        "SHOWCASE",
        "CAREER",
        "ACHIEVEMENT",
        "SYSTEM",
      ],
      required: true,
      index: true,
    },
    audience: { type: Schema.Types.Mixed, required: true },
    score: { type: Number, default: 0, index: true },
    expiresAt: { type: Date, default: null },
    metadata: metadataField,
  },
  { collection: "activity_feed", timestamps: true },
);

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ universityId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ universityId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });
notificationSchema.index({
  recipientId: 1,
  entityType: 1,
  entityId: 1,
  "metadata.idempotencyKey": 1,
});
notificationSchema.index({ deletedAt: 1, status: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
activityFeedSchema.index({ universityId: 1, category: 1, createdAt: -1 });
activityFeedSchema.index({ universityId: 1, visibility: 1, createdAt: -1 });
activityFeedSchema.index({ universityId: 1, collegeId: 1, createdAt: -1 });
activityFeedSchema.index({ universityId: 1, departmentId: 1, createdAt: -1 });
activityFeedSchema.index({ actorId: 1, createdAt: -1 });
activityFeedSchema.index({ activityType: 1, createdAt: -1 });
activityFeedSchema.index({ entityType: 1, entityId: 1 });
activityFeedSchema.index({ score: -1, createdAt: -1 });
activityFeedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export type ActivityFeedDocument = InferSchemaType<typeof activityFeedSchema>;

export const NotificationModel =
  models.Notification ||
  model<NotificationDocument>("Notification", notificationSchema);
export const ActivityFeedModel =
  models.ActivityFeed ||
  model<ActivityFeedDocument>("ActivityFeed", activityFeedSchema);
