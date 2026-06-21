"use client";

import { KeyRound, Loader2, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useOverlayCoordinator } from "@/components/overlays/overlay-coordinator";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { authClient } from "@/lib/auth/client";

type SecurityState = {
  hasPasskey: boolean;
  passkeyCount: number;
  twoFactorEnabled: boolean;
};

type ApiResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

const AUTHENTICATED_PATH_PREFIXES = [
  "/student",
  "/super-admin",
  "/campus-admin",
  "/representative",
  "/committee-member",
  "/teacher",
  "/employer",
  "/alumni",
  "/dashboard",
];

const REMIND_LATER_DAYS = 7;

function isAuthenticatedRoute(pathname: string) {
  return AUTHENTICATED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function settingsHrefForRole(role?: string | null) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin/settings";
    case "CAMPUS_ADMIN":
      return "/campus-admin/settings";
    case "REPRESENTATIVE":
      return "/representative/settings";
    case "TEACHER":
      return "/teacher/settings";
    case "EMPLOYER":
      return "/employer/settings";
    case "ALUMNI":
      return "/alumni/settings";
    default:
      return "/student/profile";
  }
}

function readDismissedUntil(storageKey: string) {
  if (typeof window === "undefined") return 0;

  const value = window.localStorage.getItem(storageKey);
  const timestamp = value ? Number(value) : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dismissReminder(storageKey: string) {
  if (typeof window === "undefined") return;

  const dismissedUntil = Date.now() + REMIND_LATER_DAYS * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(storageKey, String(dismissedUntil));
}

export function SecuritySetupReminder() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isPending, user } = useAuth();
  const { activeOverlay, claimOverlay, releaseOverlay } =
    useOverlayCoordinator();
  const [open, setOpen] = useState(false);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const storageKey = useMemo(
    () => (user?.id ? `campushub:passkey-reminder:${user.id}` : null),
    [user?.id],
  );

  useEffect(() => {
    let active = true;

    async function checkPasskeyState() {
      if (
        isPending ||
        !isAuthenticated ||
        !user?.id ||
        !storageKey ||
        !isAuthenticatedRoute(pathname) ||
        pathname.endsWith("/settings") ||
        pathname.includes("/settings/")
      ) {
        setOpen(false);
        releaseOverlay("security-setup");
        return;
      }

      if (Date.now() < readDismissedUntil(storageKey)) {
        return;
      }

      try {
        const response = await fetch("/api/account/security-state", {
          credentials: "include",
        });
        const body = (await response.json()) as ApiResponse<SecurityState>;

        if (active && body.data && !body.data.hasPasskey) {
          if (!claimOverlay("security-setup")) {
            setOpen(false);
            return;
          }

          setOpen(true);
        }
      } catch {
        return;
      } finally {
        if (active) setHasChecked(true);
      }
    }

    void checkPasskeyState();

    return () => {
      active = false;
    };
  }, [
    activeOverlay,
    claimOverlay,
    isAuthenticated,
    isPending,
    pathname,
    releaseOverlay,
    storageKey,
    user?.id,
  ]);

  async function createPasskey() {
    setIsPasskeySubmitting(true);

    const response = await authClient.passkey.addPasskey({
      name: "CampusHub passkey",
      authenticatorAttachment: "platform",
    });

    setIsPasskeySubmitting(false);

    if (response.error) {
      toast.error(response.error.message || "Unable to create passkey.");
      return;
    }

    if (storageKey) dismissReminder(storageKey);
    setOpen(false);
    releaseOverlay("security-setup");
    toast.success("Passkey created for this account.");
  }

  function remindLater() {
    if (storageKey) dismissReminder(storageKey);
    setOpen(false);
    releaseOverlay("security-setup");
  }

  function openSettings() {
    if (storageKey) dismissReminder(storageKey);
    setOpen(false);
    releaseOverlay("security-setup");
    router.push(settingsHrefForRole(user?.role));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && open) {
      remindLater();
      return;
    }

    setOpen(nextOpen);
    if (!nextOpen) releaseOverlay("security-setup");
  }

  if (!hasChecked && !open) return null;

  return (
    <Modal
      className="max-w-4xl"
      description="Add a passkey so you can sign in quickly with your device."
      onOpenChange={handleOpenChange}
      open={open}
      title="Secure Your Next Login"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex h-full flex-col justify-between gap-5 rounded-lg border border-border bg-background p-5">
          <div className="space-y-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">
                Set up passkey login
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Use your fingerprint, face unlock, screen lock, or security key
                to sign in without typing your password.
              </p>
            </div>
          </div>
          <Button
            className="w-full"
            disabled={isPasskeySubmitting}
            onClick={createPasskey}
            type="button"
          >
            {isPasskeySubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            Create passkey
          </Button>
        </section>

        <section className="flex h-full flex-col justify-between gap-5 rounded-lg border border-border bg-background p-5">
          <div className="space-y-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Settings className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">
                Manage security settings
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Configure passkeys and authenticator app protection from your
                account security settings.
              </p>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={openSettings}
            type="button"
            variant="secondary"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Open settings
          </Button>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={remindLater} type="button" variant="ghost">
          Remind me later
        </Button>
      </div>
    </Modal>
  );
}
