import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  metadataField,
  tenantLifecycleFields,
} from "@/lib/db/models/model-helpers";

const badgeSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: null, trim: true },
    icon: { type: String, default: null, trim: true },
    iconUrl: { type: String, default: null, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    rarity: {
      type: String,
      enum: ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"],
      default: "COMMON",
      index: true,
    },
    criteria: { type: Schema.Types.Mixed, required: true },
    xpReward: { type: Number, default: 0 },
    isGlobal: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "badges", timestamps: true },
);

const userBadgeSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    badgeId: { type: String, required: true, index: true },
    earnedAt: { type: Date, default: Date.now, index: true },
    displayOnProfile: { type: Boolean, default: true, index: true },
    source: { type: String, default: null, trim: true, index: true },
    metadata: metadataField,
  },
  { collection: "user_badges", timestamps: true },
);

const achievementSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: null, trim: true },
    requirements: { type: Schema.Types.Mixed, required: true },
    xpReward: { type: Number, default: 0 },
    badgeReward: { type: Schema.Types.Mixed, default: null },
    visibility: {
      type: String,
      enum: ["PUBLIC", "UNIVERSITY", "COLLEGE", "DEPARTMENT", "PRIVATE"],
      default: "UNIVERSITY",
      index: true,
    },
    isGlobal: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "achievements", timestamps: true },
);

const userAchievementSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    achievementId: { type: String, required: true, index: true },
    progress: { type: Schema.Types.Mixed, default: null },
    progressValue: { type: Number, default: 0, index: true },
    targetValue: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED"],
      default: "IN_PROGRESS",
      index: true,
    },
    startedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null, index: true },
    rewardsGrantedAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "user_achievements", timestamps: true },
);

const rewardEventSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    trigger: {
      type: String,
      enum: [
        "XP_EARNED",
        "BADGE_EARNED",
        "ACHIEVEMENT_UNLOCKED",
        "LEVEL_UP",
        "LEADERBOARD_PROMOTION",
        "MILESTONE_REACHED",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    reward: { type: Schema.Types.Mixed, default: null },
    xp: { type: Number, default: 0 },
    badge: { type: Schema.Types.Mixed, default: null },
    animationType: {
      type: String,
      enum: [
        "CONFETTI",
        "BADGE_POP",
        "LEVEL_UP",
        "TROPHY",
        "FIREWORKS",
        "SPOTLIGHT",
      ],
      default: "CONFETTI",
      index: true,
    },
    entityType: { type: String, default: null, trim: true, index: true },
    entityId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ["UNSEEN", "SEEN", "ARCHIVED"],
      default: "UNSEEN",
      index: true,
    },
    seenAt: { type: Date, default: null, index: true },
    archivedAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "reward_events", timestamps: true },
);

const xpTransactionSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    xpAwarded: { type: Number, required: true, index: true },
    sourceType: { type: String, required: true, trim: true, index: true },
    sourceId: { type: String, default: null, index: true },
    transactionType: {
      type: String,
      enum: ["AWARD", "REMOVE"],
      default: "AWARD",
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    points: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    metadata: metadataField,
  },
  { collection: "xp_transactions", timestamps: true },
);

const userXpProfileSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    totalXp: { type: Number, default: 0, index: true },
    level: { type: Number, default: 1, index: true },
    rank: { type: Number, default: null, index: true },
    weeklyXp: { type: Number, default: 0, index: true },
    monthlyXp: { type: Number, default: 0, index: true },
    lastActivityAt: { type: Date, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "user_xp_profiles", timestamps: true },
);

const streakSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    streakType: { type: String, required: true, trim: true, index: true },
    currentCount: { type: Number, default: 0 },
    longestCount: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null, index: true },
    lastBrokenAt: { type: Date, default: null, index: true },
    recoveryTokens: { type: Number, default: 0 },
    recoveryCount: { type: Number, default: 0 },
    lastRecoveryAt: { type: Date, default: null, index: true },
    milestonesEarned: { type: [Number], default: [], index: true },
    milestoneBadgesEarned: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["ACTIVE", "BROKEN", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
  },
  { collection: "streaks", timestamps: true },
);

badgeSchema.index({ universityId: 1, name: 1 }, { unique: true });
badgeSchema.index({ universityId: 1, slug: 1 }, { unique: true });
badgeSchema.index({ universityId: 1, category: 1, status: 1 });
badgeSchema.index({ universityId: 1, rarity: 1, status: 1 });
userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
userBadgeSchema.index({ universityId: 1, earnedAt: -1 });
userBadgeSchema.index({ userId: 1, displayOnProfile: 1, earnedAt: -1 });
achievementSchema.index({ universityId: 1, name: 1 }, { unique: true });
achievementSchema.index({ universityId: 1, slug: 1 }, { unique: true });
achievementSchema.index({ universityId: 1, visibility: 1, status: 1 });
achievementSchema.index({ isGlobal: 1, status: 1 });
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
userAchievementSchema.index({ universityId: 1, userId: 1, completedAt: -1 });
userAchievementSchema.index({ universityId: 1, status: 1, updatedAt: -1 });
rewardEventSchema.index({ userId: 1, status: 1, createdAt: -1 });
rewardEventSchema.index({ universityId: 1, trigger: 1, createdAt: -1 });
rewardEventSchema.index({ entityType: 1, entityId: 1 });
xpTransactionSchema.index({ universityId: 1, userId: 1, createdAt: -1 });
xpTransactionSchema.index({ universityId: 1, action: 1, createdAt: -1 });
xpTransactionSchema.index({ sourceType: 1, sourceId: 1 });
xpTransactionSchema.index(
  { universityId: 1, userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);
userXpProfileSchema.index({ universityId: 1, userId: 1 }, { unique: true });
userXpProfileSchema.index({ universityId: 1, totalXp: -1 });
userXpProfileSchema.index({ universityId: 1, weeklyXp: -1 });
userXpProfileSchema.index({ universityId: 1, monthlyXp: -1 });
streakSchema.index(
  { universityId: 1, userId: 1, streakType: 1 },
  { unique: true },
);
streakSchema.index({ universityId: 1, streakType: 1, currentCount: -1 });
streakSchema.index({ universityId: 1, streakType: 1, longestCount: -1 });

export type BadgeDocument = InferSchemaType<typeof badgeSchema>;
export type UserBadgeDocument = InferSchemaType<typeof userBadgeSchema>;
export type AchievementDocument = InferSchemaType<typeof achievementSchema>;
export type UserAchievementDocument = InferSchemaType<
  typeof userAchievementSchema
>;
export type RewardEventDocument = InferSchemaType<typeof rewardEventSchema>;
export type XpTransactionDocument = InferSchemaType<typeof xpTransactionSchema>;
export type UserXpProfileDocument = InferSchemaType<typeof userXpProfileSchema>;
export type StreakDocument = InferSchemaType<typeof streakSchema>;

export const BadgeModel =
  models.Badge || model<BadgeDocument>("Badge", badgeSchema);
export const UserBadgeModel =
  models.UserBadge || model<UserBadgeDocument>("UserBadge", userBadgeSchema);
export const AchievementModel =
  models.Achievement ||
  model<AchievementDocument>("Achievement", achievementSchema);
export const UserAchievementModel =
  models.UserAchievement ||
  model<UserAchievementDocument>("UserAchievement", userAchievementSchema);
export const RewardEventModel =
  models.RewardEvent ||
  model<RewardEventDocument>("RewardEvent", rewardEventSchema);
export const XpTransactionModel =
  models.XpTransaction ||
  model<XpTransactionDocument>("XpTransaction", xpTransactionSchema);
export const UserXpProfileModel =
  models.UserXpProfile ||
  model<UserXpProfileDocument>("UserXpProfile", userXpProfileSchema);
export const StreakModel =
  models.Streak || model<StreakDocument>("Streak", streakSchema);
