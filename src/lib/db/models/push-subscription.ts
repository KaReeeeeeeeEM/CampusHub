import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

const pushSubscriptionSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["native", "firebase", "onesignal"],
      default: "native",
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    keys: {
      p256dh: { type: String, default: null },
      auth: { type: String, default: null },
    },
    token: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    disabledAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    collection: "push_subscription",
    timestamps: true,
  },
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ provider: 1, disabledAt: 1 });

export type PushSubscriptionDocument = InferSchemaType<
  typeof pushSubscriptionSchema
>;

export const PushSubscriptionModel =
  models.PushSubscription ||
  model<PushSubscriptionDocument>("PushSubscription", pushSubscriptionSchema);
