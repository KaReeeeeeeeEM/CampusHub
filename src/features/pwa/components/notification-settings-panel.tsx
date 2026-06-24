"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FiBell, FiLoader, FiSmartphone } from "react-icons/fi";

import { CampusCheckbox, campusToast } from "@/components/campushub";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import {
  defaultNotificationPreferences,
  notificationPreferenceItems,
  type NotificationPreferences,
} from "@/features/pwa/lib/notification-preferences";
import {
  deleteFirebaseMessagingToken,
  getFirebaseMessagingStatus,
  registerFirebaseMessagingToken,
} from "@/features/pwa/lib/firebase-client";

type ApiEnvelope<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

export function NotificationSettingsPanel() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [isPending, startTransition] = useTransition();

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const firebaseStatus = useMemo(() => getFirebaseMessagingStatus(), []);
  const firebasePushConfigured =
    firebaseStatus.configured && firebaseStatus.vapidConfigured;
  const pushConfigured = firebasePushConfigured || Boolean(vapidPublicKey);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
    } else {
      setPushStatus(Notification.permission);
    }

    fetch("/api/notification-preferences", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload: ApiEnvelope<{ preferences: NotificationPreferences }>) => {
        if (payload.data?.preferences) {
          setPreferences(payload.data.preferences);
        }
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const pushDescription = useMemo(() => {
    if (pushStatus === "unsupported") {
      return "This browser does not support installable push notifications.";
    }

    if (firebasePushConfigured) {
      return pushStatus === "granted"
        ? "Firebase push notifications are enabled for this browser."
        : "Enable Firebase push notifications for time-sensitive CampusHub updates.";
    }

    if (!pushConfigured) {
      return "Browser notifications are available. Add the Firebase web config and web push certificate key to activate server push delivery.";
    }

    if (pushStatus === "granted") {
      return "Push notifications are enabled for this browser.";
    }

    if (pushStatus === "denied") {
      return "Push notifications are blocked in this browser. Update browser site permissions to enable them.";
    }

    return "Enable browser push notifications for time-sensitive CampusHub updates.";
  }, [firebasePushConfigured, pushConfigured, pushStatus]);

  function setPreference(
    key: keyof NotificationPreferences,
    checked: boolean,
  ) {
    setPreferences((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function savePreferences(nextPreferences = preferences) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/notification-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(nextPreferences),
        });
        const payload = (await response.json()) as ApiEnvelope<{
          preferences: NotificationPreferences;
        }>;

        if (!response.ok || !payload.data?.preferences) {
          throw new Error(
            payload.error?.message || "Notification preferences were not saved.",
          );
        }

        setPreferences(payload.data.preferences);
        campusToast.success({
          title: "Notification Settings Saved",
          description: "Your notification preferences were updated.",
        });
      } catch (error) {
        campusToast.error({
          title: "Notification Settings Not Saved",
          description:
            error instanceof Error
              ? error.message
              : "Unable to save notification preferences.",
        });
      }
    });
  }

  async function enablePushNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushStatus(permission);

    if (permission !== "granted") {
      return;
    }

    if (firebasePushConfigured) {
      try {
        const token = await registerFirebaseMessagingToken();

        await fetch("/api/push-subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            provider: "firebase",
            endpoint: `https://fcm.googleapis.com/fcm/send/${encodeURIComponent(token)}`,
            token,
            userAgent: navigator.userAgent,
          }),
        });

        savePreferences({
          ...preferences,
          pushEnabled: true,
        });
        return;
      } catch (error) {
        campusToast.error({
          title: "Firebase Push Not Enabled",
          description:
            error instanceof Error
              ? error.message
              : "CampusHub could not register this browser with Firebase.",
        });
        return;
      }
    }

    if (!vapidPublicKey) {
      campusToast.info({
        title: "Browser Notifications Allowed",
        description:
          "Add NEXT_PUBLIC_FIREBASE_* keys or NEXT_PUBLIC_VAPID_PUBLIC_KEY to activate server push delivery.",
      });
      savePreferences({
        ...preferences,
        pushEnabled: false,
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "native",
          ...subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      savePreferences({
        ...preferences,
        pushEnabled: true,
      });
    } catch {
      campusToast.error({
        title: "Push Not Enabled",
        description:
          "CampusHub could not register this browser for push notifications.",
      });
    }
  }

  async function disablePushNotifications() {
    await deleteFirebaseMessagingToken().catch(() => undefined);

    const registration =
      "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;

    if (subscription) {
      await subscription.unsubscribe();
    }

    await fetch("/api/push-subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: subscription?.endpoint ?? null,
      }),
    }).catch(() => undefined);

    savePreferences({
      ...preferences,
      pushEnabled: false,
    });
  }

  if (isLoading) {
    return <LoadingState label="Loading notification preferences" />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiSmartphone className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Push notifications</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {pushDescription}
              </p>
            </div>
          </div>
          {preferences.pushEnabled ? (
            <Button
              type="button"
              variant="secondary"
              onClick={disablePushNotifications}
            >
              Disable push
            </Button>
          ) : (
            <Button
              disabled={pushStatus === "unsupported" || pushStatus === "denied"}
              type="button"
              onClick={enablePushNotifications}
            >
              <FiBell className="h-4 w-4" aria-hidden="true" />
              Enable push
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {notificationPreferenceItems.map((item) => (
          <label
            key={item.key}
            className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4"
          >
            <span>
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {item.description}
              </span>
            </span>
            <CampusCheckbox
              checked={Boolean(preferences[item.key])}
              onChange={(event) =>
                setPreference(item.key, event.target.checked)
              }
            />
          </label>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
        Notification delivery uses CampusHub preferences today. The push
        subscription API stores provider metadata so Firebase Cloud Messaging or
        OneSignal can be connected later without changing the settings UI.
      </div>

      <Button disabled={isPending} type="button" onClick={() => savePreferences()}>
        {isPending ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        Save Notifications
      </Button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
