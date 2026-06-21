import { randomUUID } from "node:crypto";

import {
  defaultNotificationPreferences,
  normalizeNotificationPreferences,
  notificationPreferenceSchema,
  type NotificationPreferences,
} from "@/features/pwa/lib/notification-preferences";
import { connectMongo } from "@/lib/db/mongodb";
import { PushSubscriptionModel, UserModel } from "@/lib/db/models";
import { requireAuth } from "@/lib/auth/session";

export type PushProvider = "native" | "firebase" | "onesignal";

type PushSubscriptionInput = {
  provider?: PushProvider;
  endpoint: string;
  keys?: {
    p256dh?: string | null;
    auth?: string | null;
  };
  token?: string | null;
  userAgent?: string | null;
};

export async function getNotificationPreferences() {
  const user = await requireAuth();
  await connectMongo();

  const record = await UserModel.findById(user.id)
    .select({ notificationPreferences: 1 })
    .lean();

  return normalizeNotificationPreferences(
    (record as Record<string, unknown> | null)?.notificationPreferences,
  );
}

export async function updateNotificationPreferences(input: unknown) {
  const user = await requireAuth();
  await connectMongo();

  const preferences = notificationPreferenceSchema.parse(input);

  await UserModel.updateOne(
    { _id: user.id },
    {
      $set: {
        notificationPreferences: preferences,
      },
    },
  );

  return preferences;
}

export async function registerPushSubscription(input: PushSubscriptionInput) {
  const user = await requireAuth();
  await connectMongo();

  const provider = input.provider ?? "native";
  await PushSubscriptionModel.findOneAndUpdate(
    {
      userId: user.id,
      endpoint: input.endpoint,
    },
    {
      $set: {
        provider,
        endpoint: input.endpoint,
        keys: {
          p256dh: input.keys?.p256dh ?? null,
          auth: input.keys?.auth ?? null,
        },
        token: input.token ?? null,
        userAgent: input.userAgent ?? null,
        lastSeenAt: new Date(),
        disabledAt: null,
      },
      $setOnInsert: {
        _id: randomUUID(),
        userId: user.id,
      },
    },
    { upsert: true, new: true },
  );

  await UserModel.updateOne(
    { _id: user.id },
    {
      $set: {
        "notificationPreferences.pushEnabled": true,
      },
    },
  );

  return {
    provider,
    endpoint: input.endpoint,
  };
}

export async function disablePushSubscription(endpoint?: string | null) {
  const user = await requireAuth();
  await connectMongo();
  const filter = endpoint
    ? { userId: user.id, endpoint }
    : { userId: user.id, disabledAt: null };

  await PushSubscriptionModel.updateMany(filter, {
    $set: {
      disabledAt: new Date(),
    },
  });
  await UserModel.updateOne(
    { _id: user.id },
    {
      $set: {
        notificationPreferences: {
          ...defaultNotificationPreferences,
          ...(await getNotificationPreferences()),
          pushEnabled: false,
        } satisfies NotificationPreferences,
      },
    },
  );

  return { disabled: true };
}
