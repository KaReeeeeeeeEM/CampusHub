import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import {
  resolvePushNotificationPayload,
  type CampusHubPushPayload,
} from "@/features/pwa/lib/push-notifications";
import { PushSubscriptionModel } from "@/lib/db/models";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type FirebaseAdminStatus = {
  configured: boolean;
  missing: string[];
};

type NotificationDispatchRecord = {
  _id: string;
  recipientId: string;
  type: string;
  title: string;
  body?: string | null;
  message?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  priority?: string | null;
  channels?: {
    push?: boolean;
  };
  metadata?: Record<string, unknown> | null;
};

function readFirebaseServiceAccount(): FirebaseServiceAccount | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };

    const projectId = parsed.project_id ?? parsed.projectId;
    const clientEmail = parsed.client_email ?? parsed.clientEmail;
    const privateKey = parsed.private_key ?? parsed.privateKey;

    if (projectId && clientEmail && privateKey) {
      return {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      };
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function getFirebaseAdminStatus(): FirebaseAdminStatus {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return {
        configured: Boolean(readFirebaseServiceAccount()),
        missing: readFirebaseServiceAccount()
          ? []
          : ["FIREBASE_SERVICE_ACCOUNT_JSON"],
      };
    } catch {
      return {
        configured: false,
        missing: ["FIREBASE_SERVICE_ACCOUNT_JSON"],
      };
    }
  }

  const required = [
    ["FIREBASE_PROJECT_ID", process.env.FIREBASE_PROJECT_ID],
    ["FIREBASE_CLIENT_EMAIL", process.env.FIREBASE_CLIENT_EMAIL],
    ["FIREBASE_PRIVATE_KEY", process.env.FIREBASE_PRIVATE_KEY],
  ] as const;

  return {
    configured: required.every(([, value]) => Boolean(value)),
    missing: required
      .filter(([, value]) => !value)
      .map(([key]) => key),
  };
}

function getFirebaseAdminApp() {
  const serviceAccount = readFirebaseServiceAccount();

  if (!serviceAccount) return null;

  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
}

function engagementTypeForNotification(notification: NotificationDispatchRecord) {
  if (
    notification.metadata &&
    typeof notification.metadata.engagementType === "string"
  ) {
    return notification.metadata.engagementType;
  }

  switch (notification.type) {
    case "ANNOUNCEMENT":
      return "announcement";
    case "EVENT":
    case "EVENT_REMINDER":
      return "event";
    case "ORDER":
    case "MARKETPLACE":
      return "marketplace_order";
    case "PROJECT":
    case "PROJECT_STAR":
    case "PROJECT_COMMENT":
      return "project_star";
    case "BADGE":
      return "badge_unlock";
    case "STREAK_REMINDER":
      return "streak_reminder";
    case "ALMANAC_REMINDER":
      return "almanac_reminder";
    default:
      return "announcement";
  }
}

function buildFirebasePayload(notification: NotificationDispatchRecord) {
  const resolved = resolvePushNotificationPayload({
    type: engagementTypeForNotification(
      notification,
    ) as CampusHubPushPayload["type"],
    title: notification.title,
    body: notification.body ?? notification.message ?? undefined,
    url: notification.actionUrl ?? undefined,
    entityId: notification.entityId ?? undefined,
    entityType: notification.entityType ?? undefined,
    metadata: {
      ...(notification.metadata ?? {}),
      notificationId: notification._id,
      priority: notification.priority ?? "NORMAL",
    },
  });

  return {
    notification: {
      title: resolved.title,
      body: resolved.body,
    },
    data: {
      type: resolved.type,
      title: resolved.title,
      body: resolved.body,
      url: resolved.url,
      tag: resolved.tag,
      entityId: String(resolved.metadata.entityId ?? ""),
      entityType: String(resolved.metadata.entityType ?? ""),
      notificationId: notification._id,
      metadata: JSON.stringify(resolved.metadata),
    },
    webpush: {
      fcmOptions: {
        link: resolved.url,
      },
      notification: {
        icon: "/logo.png",
        badge: "/logo.png",
        tag: resolved.tag,
        renotify: resolved.priority === "high",
      },
    },
  };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function deliverFirebaseNotifications(
  notifications: NotificationDispatchRecord[],
) {
  const firebaseNotifications = notifications.filter(
    (notification) => notification.channels?.push,
  );

  if (!firebaseNotifications.length) {
    return { attempted: 0, sent: 0, failed: 0, skipped: "no_push_records" };
  }

  const app = getFirebaseAdminApp();

  if (!app) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: "firebase_not_configured",
    };
  }

  const recipientIds = Array.from(
    new Set(firebaseNotifications.map((notification) => notification.recipientId)),
  );
  const subscriptions = await PushSubscriptionModel.find({
    userId: { $in: recipientIds },
    provider: "firebase",
    token: { $type: "string", $ne: "" },
    disabledAt: null,
  })
    .select({ userId: 1, token: 1 })
    .lean();

  if (!subscriptions.length) {
    return { attempted: 0, sent: 0, failed: 0, skipped: "no_firebase_tokens" };
  }

  const tokensByUserId = new Map<string, string[]>();

  for (const subscription of subscriptions) {
    const userId = String(subscription.userId);
    const token = String(subscription.token);

    tokensByUserId.set(userId, [...(tokensByUserId.get(userId) ?? []), token]);
  }

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  const invalidTokens = new Set<string>();
  const messaging = getMessaging(app);

  for (const notification of firebaseNotifications) {
    const tokens = tokensByUserId.get(notification.recipientId) ?? [];
    const payload = buildFirebasePayload(notification);

    for (const tokenChunk of chunk(tokens, 500)) {
      attempted += tokenChunk.length;
      const result = await messaging.sendEachForMulticast({
        ...payload,
        tokens: tokenChunk,
      });

      sent += result.successCount;
      failed += result.failureCount;

      result.responses.forEach((response, index) => {
        const code = response.error?.code;

        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          invalidTokens.add(tokenChunk[index]);
        }
      });
    }
  }

  if (invalidTokens.size) {
    await PushSubscriptionModel.updateMany(
      {
        provider: "firebase",
        token: { $in: Array.from(invalidTokens) },
      },
      {
        $set: {
          disabledAt: new Date(),
        },
      },
    );
  }

  return {
    attempted,
    sent,
    failed,
    disabledInvalidTokens: invalidTokens.size,
  };
}
