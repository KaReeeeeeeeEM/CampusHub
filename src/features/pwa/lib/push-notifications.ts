import {
  ENGAGEMENT_CAMPAIGNS,
  type EngagementEventType,
} from "./engagement-events";

export type PushNotificationProvider = "native" | "firebase" | "onesignal";

export type CampusHubPushPayload = {
  type: EngagementEventType;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, unknown>;
};

export type ResolvedPushNotification = {
  title: string;
  body: string;
  url: string;
  tag: string;
  type: EngagementEventType;
  priority: string;
  metadata: Record<string, unknown>;
};

export const SUPPORTED_PUSH_EVENTS = Object.keys(
  ENGAGEMENT_CAMPAIGNS,
) as EngagementEventType[];

export function resolvePushNotificationPayload(
  payload: CampusHubPushPayload,
): ResolvedPushNotification {
  const campaign = ENGAGEMENT_CAMPAIGNS[payload.type];

  return {
    title: payload.title ?? campaign.defaultTitle,
    body: payload.body ?? campaign.defaultBody,
    url: payload.url ?? campaign.defaultUrl,
    tag: payload.tag ?? `campushub-${payload.type}`,
    type: payload.type,
    priority: campaign.priority,
    metadata: {
      ...(payload.metadata ?? {}),
      entityId: payload.entityId,
      entityType: payload.entityType,
      preferenceKey: campaign.preferenceKey,
      kiboAnimation: campaign.kiboAnimation,
    },
  };
}

export function getPushCapabilitySnapshot() {
  if (typeof window === "undefined") {
    return {
      serviceWorker: false,
      notifications: false,
      pushManager: false,
      backgroundSync: false,
      installPrompt: false,
    };
  }

  return {
    serviceWorker: "serviceWorker" in navigator,
    notifications: "Notification" in window,
    pushManager: "PushManager" in window,
    backgroundSync: "serviceWorker" in navigator && "SyncManager" in window,
    installPrompt: "BeforeInstallPromptEvent" in window,
  };
}

