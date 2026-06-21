"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBell,
  FiCheckCircle,
  FiDownload,
  FiRefreshCw,
  FiSend,
  FiSettings,
  FiWifiOff,
  FiXCircle,
} from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationSettingsPanel } from "@/features/pwa/components/notification-settings-panel";
import { ReleaseNotesModal } from "@/features/pwa/components/release-notes-modal";
import { engagementCampaigns } from "@/features/pwa/lib/engagement-events";
import {
  getPushCapabilitySnapshot,
  resolvePushNotificationPayload,
  type CampusHubPushPayload,
} from "@/features/pwa/lib/push-notifications";
import { CAMPUSHUB_RELEASE } from "@/features/pwa/lib/release-notes";
import { KiboNotification, useKibo } from "@/lib/kibo";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type ServiceWorkerStatus = {
  supported: boolean;
  registered: boolean;
  active: boolean;
  scope?: string;
};

const samplePushPayload: CampusHubPushPayload = {
  type: "project_star",
  title: "Project Star Received",
  body: "Someone appreciated your CampusHub project.",
  url: "/student/showcase/my-projects",
};

export default function PwaShowcasePage() {
  const { showNotification } = useKibo();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installOutcome, setInstallOutcome] = useState<string>("Not requested");
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [serviceWorkerStatus, setServiceWorkerStatus] =
    useState<ServiceWorkerStatus>({
      supported: false,
      registered: false,
      active: false,
    });
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);

  const capabilities = useMemo(() => getPushCapabilitySnapshot(), []);
  const resolvedSamplePayload =
    resolvePushNotificationPayload(samplePushPayload);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }

    async function loadServiceWorkerStatus() {
      if (!("serviceWorker" in navigator)) {
        setServiceWorkerStatus({
          supported: false,
          registered: false,
          active: false,
        });
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration("/");
      setServiceWorkerStatus({
        supported: true,
        registered: Boolean(registration),
        active: Boolean(registration?.active),
        scope: registration?.scope,
      });
    }

    void loadServiceWorkerStatus();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  async function requestInstall() {
    if (!installPrompt) {
      setInstallOutcome("Install prompt is not currently available.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallOutcome(choice.outcome);
    setInstallPrompt(null);
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function showLocalNotification() {
    showNotification({
      animation: "projectStar",
      title: resolvedSamplePayload.title,
      description: resolvedSamplePayload.body,
      category: "projects",
      priority: "normal",
    });

    if (
      notificationPermission !== "granted" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(resolvedSamplePayload.title, {
      body: resolvedSamplePayload.body,
      icon: "/logo.png",
      badge: "/logo.png",
      tag: resolvedSamplePayload.tag,
      data: {
        url: resolvedSamplePayload.url,
        type: resolvedSamplePayload.type,
        metadata: resolvedSamplePayload.metadata,
      },
    });
  }

  return (
    <main className="mx-auto w-full max-w-none space-y-8 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Phase 16
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            PWA & Engagement Foundation
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Internal verification for installability, offline support, push
            architecture, update detection, notification preferences, release
            notes, and Kibo engagement integration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setReleaseNotesOpen(true)}>
            <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
            Release notes
          </Button>
          <Button type="button" variant="secondary" onClick={showLocalNotification}>
            <FiSend className="h-4 w-4" aria-hidden="true" />
            Test notification
          </Button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-4">
        <CapabilityCard
          icon={FiDownload}
          title="Installable"
          status={installPrompt ? "Ready" : "Browser controlled"}
          pass={capabilities.serviceWorker}
          description="Desktop and mobile install prompts are controlled by the browser once manifest and service worker criteria pass."
        />
        <CapabilityCard
          icon={FiWifiOff}
          title="Offline"
          status={serviceWorkerStatus.active ? "Active" : "Pending"}
          pass={serviceWorkerStatus.active}
          description="Offline page, cached shell, runtime caching, and queued API mutations are handled by the service worker."
        />
        <CapabilityCard
          icon={FiBell}
          title="Push"
          status={notificationPermission}
          pass={capabilities.notifications && capabilities.pushManager}
          description="Native Web Push is available now, with provider metadata ready for Firebase or OneSignal."
        />
        <CapabilityCard
          icon={FiRefreshCw}
          title="Updates"
          status={CAMPUSHUB_RELEASE.version}
          pass={serviceWorkerStatus.supported}
          description="The provider detects waiting workers and opens release notes after an update is applied."
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Install & Browser Permissions</CardTitle>
            <CardDescription>
              Use this panel to verify desktop, Android, iOS, and notification
              prerequisites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusRow
              label="Service worker"
              value={
                serviceWorkerStatus.registered
                  ? `Registered${serviceWorkerStatus.scope ? ` at ${serviceWorkerStatus.scope}` : ""}`
                  : "Not registered"
              }
              pass={serviceWorkerStatus.registered}
            />
            <StatusRow
              label="Push manager"
              value={capabilities.pushManager ? "Supported" : "Unavailable"}
              pass={capabilities.pushManager}
            />
            <StatusRow
              label="Background sync"
              value={capabilities.backgroundSync ? "Supported" : "Unavailable"}
              pass={capabilities.backgroundSync}
            />
            <StatusRow
              label="Install prompt"
              value={installPrompt ? "Ready to prompt" : installOutcome}
              pass={Boolean(installPrompt)}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                disabled={!installPrompt}
                type="button"
                onClick={requestInstall}
              >
                <FiDownload className="h-4 w-4" aria-hidden="true" />
                Install app
              </Button>
              <Button
                disabled={notificationPermission === "unsupported"}
                type="button"
                variant="secondary"
                onClick={requestNotificationPermission}
              >
                <FiBell className="h-4 w-4" aria-hidden="true" />
                Request notifications
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kibo Notification Integration</CardTitle>
            <CardDescription>
              Engagement events map to Kibo animations and notification
              priorities from one registry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KiboNotification
              animation="projectStar"
              title={resolvedSamplePayload.title}
              description={resolvedSamplePayload.body}
            />
            <div className="mt-4 rounded-lg border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
              Sample payload resolves to tag{" "}
              <span className="font-semibold text-foreground">
                {resolvedSamplePayload.tag}
              </span>{" "}
              and opens{" "}
              <span className="font-semibold text-foreground">
                {resolvedSamplePayload.url}
              </span>
              .
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Engagement Campaign Registry</CardTitle>
            <CardDescription>
              Supported push and in-app notification events for Phase 16.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {engagementCampaigns.map((campaign) => (
              <div
                key={campaign.type}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{campaign.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Preference: {campaign.preferenceKey}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {campaign.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {campaign.defaultBody}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <FiSettings className="h-4 w-4" aria-hidden="true" />
                Settings to Notifications
              </span>
            </CardTitle>
            <CardDescription>
              The same preferences panel is used in role settings pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettingsPanel />
          </CardContent>
        </Card>
      </section>

      <ReleaseNotesModal
        open={releaseNotesOpen}
        onClose={() => setReleaseNotesOpen(false)}
      />
    </main>
  );
}

function CapabilityCard({
  icon: Icon,
  title,
  status,
  pass,
  description,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  status: string;
  pass: boolean;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              pass ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {status}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  value,
  pass,
}: {
  label: string;
  value: string;
  pass: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{value}</p>
      </div>
      {pass ? (
        <FiCheckCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      ) : (
        <FiXCircle
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </div>
  );
}

