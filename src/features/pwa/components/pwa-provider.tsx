"use client";

import { useEffect, useState } from "react";
import { FiRefreshCw, FiX } from "react-icons/fi";

import { useOverlayCoordinator } from "@/components/overlays/overlay-coordinator";
import { Button } from "@/components/ui/button";
import { ReleaseNotesModal } from "@/features/pwa/components/release-notes-modal";
import {
  RELEASE_NOTES_AFTER_UPDATE_KEY,
  RELEASE_NOTES_STORAGE_KEY,
} from "@/features/pwa/lib/release-notes";
import { useKibo } from "@/lib/kibo";

type PwaProviderProps = {
  children: React.ReactNode;
};

export function PwaProvider({ children }: PwaProviderProps) {
  const { showNotification } = useKibo();
  const { activeOverlay, claimOverlay, releaseOverlay } =
    useOverlayCoordinator();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let refreshing = false;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          showNotification({
            animation: "announcement",
            title: "Update available",
            description: "A newer CampusHub version is ready to install.",
            category: "announcements",
            priority: "high",
          });
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;

          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state !== "installed") {
              return;
            }

            if (navigator.serviceWorker.controller) {
              setWaitingWorker(installingWorker);
              showNotification({
                animation: "announcement",
                title: "Update available",
                description: "A newer CampusHub version is ready to install.",
                category: "announcements",
                priority: "high",
              });
            } else {
              setOfflineReady(true);
              showNotification({
                animation: "wave",
                title: "Offline ready",
                description:
                  "CampusHub can open cached pages when your connection drops.",
                category: "onboarding",
                priority: "normal",
              });
            }
          });
        });
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    });
  }, [showNotification]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldShowAfterUpdate = window.localStorage.getItem(
      RELEASE_NOTES_AFTER_UPDATE_KEY,
    );

    if (shouldShowAfterUpdate === "true") {
      if (!claimOverlay("release-notes")) return;

      window.localStorage.removeItem(RELEASE_NOTES_AFTER_UPDATE_KEY);
      window.localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, "seen");
      setReleaseNotesOpen(true);
    }
  }, [activeOverlay, claimOverlay]);

  function applyUpdate() {
    window.localStorage.setItem(RELEASE_NOTES_AFTER_UPDATE_KEY, "true");
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  function closeReleaseNotes() {
    window.localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, "seen");
    setReleaseNotesOpen(false);
    releaseOverlay("release-notes");
  }

  return (
    <>
      {children}
      {waitingWorker ? (
        <PwaBanner
          title="Update available"
          description="A newer CampusHub version is ready."
          actionLabel="Reload"
          onAction={applyUpdate}
          secondaryActionLabel="Release notes"
          onSecondaryAction={() => {
            if (claimOverlay("release-notes")) setReleaseNotesOpen(true);
          }}
          onDismiss={() => setWaitingWorker(null)}
        />
      ) : null}
      {offlineReady ? (
        <PwaBanner
          title="Offline ready"
          description="CampusHub can now open cached pages when your connection drops."
          actionLabel="OK"
          onAction={() => setOfflineReady(false)}
          onDismiss={() => setOfflineReady(false)}
        />
      ) : null}
      <ReleaseNotesModal open={releaseNotesOpen} onClose={closeReleaseNotes} />
    </>
  );
}

function PwaBanner({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  onDismiss,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] rounded-lg border border-border bg-surface p-4 shadow-xl sm:left-auto sm:w-[26rem]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" type="button" onClick={onAction}>
              {actionLabel}
            </Button>
            {secondaryActionLabel && onSecondaryAction ? (
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={onSecondaryAction}
              >
                {secondaryActionLabel}
              </Button>
            ) : null}
          </div>
        </div>
        <Button
          aria-label="Dismiss PWA notice"
          size="icon"
          type="button"
          variant="ghost"
          onClick={onDismiss}
        >
          <FiX className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
