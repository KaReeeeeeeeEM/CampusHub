"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Info,
  LockKeyhole,
  Loader2,
  Pin,
  RotateCcw,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type RoleKey } from "@/features/authorization/roles";
import { useAuth } from "@/features/auth/auth-provider";
import {
  canAccessPortal,
  getPortalByKey,
  portalDefinitions,
  type PortalDefinition,
  type PortalKey,
} from "@/features/portal-selection/lib/portals";
import { cn } from "@/lib/utils";
import {
  type PortalSelectionSnapshot,
  usePortalSelectionStore,
} from "@/store/portal-selection-store";

type PortalPreferencesResponse = {
  preferences: PortalSelectionSnapshot;
  redirectHref?: string;
  error?: string;
};

function formatSelectedAt(value: string | null) {
  if (!value) {
    return "No portal selected yet";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getUserRoles(userRole: RoleKey | undefined, userRoles?: RoleKey[]) {
  const roles = userRoles?.length ? userRoles : userRole ? [userRole] : [];

  return Array.from(new Set(roles));
}

function PortalCard({
  portal,
  isAvailable,
  isLastUsed,
  isDefault,
  isQuickAccess,
  isPending,
  onSelect,
  onSetDefault,
  onToggleQuickAccess,
}: {
  portal: PortalDefinition;
  isAvailable: boolean;
  isLastUsed: boolean;
  isDefault: boolean;
  isQuickAccess: boolean;
  isPending: boolean;
  onSelect: (portal: PortalKey) => void;
  onSetDefault: (portal: PortalKey) => void;
  onToggleQuickAccess: (portal: PortalKey) => void;
}) {
  const Icon = portal.icon;

  return (
    <article
      className={cn(
        "rounded-lg border bg-surface p-6 shadow-sm transition-colors",
        isAvailable
          ? "border-border hover:border-primary/70"
          : "border-border opacity-75",
        isLastUsed && "border-primary",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isLastUsed ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
              <Clock3 className="h-3 w-3" aria-hidden="true" />
              Last used
            </span>
          ) : null}
          {isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Default
            </span>
          ) : null}
          {isQuickAccess ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-primary" aria-hidden="true" />
              Quick
            </span>
          ) : null}
          {!isAvailable ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
              <LockKeyhole className="h-3 w-3" aria-hidden="true" />
              Role required
            </span>
          ) : null}
        </div>
      </div>

      <h2 className="mt-5 text-xl font-semibold">{portal.title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {portal.description}
      </p>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
          Role access
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {portal.requiredRoles.map((role) => (
            <span
              key={role}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-5 grid gap-2 text-sm text-muted-foreground">
        {portal.capabilities.map((capability) => (
          <li key={capability} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {capability}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          className="sm:flex-1"
          disabled={!isAvailable || isPending}
          type="button"
          onClick={() => onSelect(portal.key)}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Enter portal
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          className="sm:flex-1"
          disabled={!isAvailable || isPending}
          type="button"
          variant="secondary"
          onClick={() => onSetDefault(portal.key)}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {isDefault ? "Default" : "Make default"}
        </Button>
        <Button
          className="sm:flex-1"
          disabled={!isAvailable || isPending}
          type="button"
          variant="secondary"
          onClick={() => onToggleQuickAccess(portal.key)}
        >
          <Pin className="h-4 w-4" aria-hidden="true" />
          {isQuickAccess ? "Remove quick" : "Add quick"}
        </Button>
      </div>
    </article>
  );
}

export function PortalSelectionView() {
  const router = useRouter();
  const { user, isPending } = useAuth();
  const availablePortals = usePortalSelectionStore(
    (state) => state.availablePortals,
  );
  const defaultPortal = usePortalSelectionStore((state) => state.defaultPortal);
  const lastUsedPortal = usePortalSelectionStore(
    (state) => state.lastUsedPortal,
  );
  const quickAccess = usePortalSelectionStore((state) => state.quickAccess);
  const selectedPortal = usePortalSelectionStore(
    (state) => state.selectedPortal,
  );
  const selectedAt = usePortalSelectionStore((state) => state.selectedAt);
  const selectPortal = usePortalSelectionStore((state) => state.selectPortal);
  const setDefaultPortal = usePortalSelectionStore(
    (state) => state.setDefaultPortal,
  );
  const toggleQuickAccess = usePortalSelectionStore(
    (state) => state.toggleQuickAccess,
  );
  const hydratePortalSelection = usePortalSelectionStore(
    (state) => state.hydrate,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [pendingPortal, setPendingPortal] = useState<PortalKey | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const userRoles = useMemo(
    () => getUserRoles(user?.role, user?.roles),
    [user?.role, user?.roles],
  );

  const lastUsed = getPortalByKey(lastUsedPortal);
  const selected = getPortalByKey(selectedPortal);
  const defaultPortalDefinition = getPortalByKey(defaultPortal);
  const quickAccessPortals = quickAccess
    .map((key) => getPortalByKey(key))
    .filter((portal): portal is PortalDefinition => Boolean(portal));

  useEffect(() => {
    let mounted = true;

    async function loadPreferences() {
      setIsLoadingPreferences(true);
      setLoadError(null);

      const response = await fetch("/api/portal-preferences", {
        cache: "no-store",
      });

      if (!mounted) {
        return;
      }

      if (!response.ok) {
        setLoadError("Unable to load portal preferences.");
        setIsLoadingPreferences(false);
        return;
      }

      const payload = (await response.json()) as PortalPreferencesResponse;
      hydratePortalSelection(payload.preferences);
      setIsLoadingPreferences(false);
    }

    void loadPreferences();

    return () => {
      mounted = false;
    };
  }, [hydratePortalSelection]);

  async function updatePreferences(
    body:
      | { action: "select"; portal: PortalKey }
      | { action: "set-default"; portal: PortalKey }
      | { action: "toggle-quick"; portal: PortalKey }
      | { action: "reset" },
  ) {
    const response = await fetch("/api/portal-preferences", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as PortalPreferencesResponse;

    if (!response.ok) {
      throw new Error(payload.error || "Unable to update portal preferences.");
    }

    hydratePortalSelection(payload.preferences);

    return payload;
  }

  async function handleSelect(portal: PortalKey) {
    const definition = getPortalByKey(portal);
    setPendingPortal(portal);
    setNotice(null);
    setLoadError(null);

    try {
      const payload = await updatePreferences({ action: "select", portal });
      selectPortal(portal);
      router.push(
        payload.redirectHref ?? definition?.href ?? "/portal-selection",
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to enter portal.",
      );
    } finally {
      setPendingPortal(null);
    }
  }

  async function handleSetDefault(portal: PortalKey) {
    setPendingPortal(portal);
    setNotice(null);
    setLoadError(null);

    try {
      await updatePreferences({ action: "set-default", portal });
      setDefaultPortal(portal);
      setNotice(`${getPortalByKey(portal)?.title ?? "Portal"} set as default.`);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to set default portal.",
      );
    } finally {
      setPendingPortal(null);
    }
  }

  async function handleToggleQuickAccess(portal: PortalKey) {
    setPendingPortal(portal);
    setNotice(null);
    setLoadError(null);

    try {
      await updatePreferences({ action: "toggle-quick", portal });
      toggleQuickAccess(portal);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to update quick access.",
      );
    } finally {
      setPendingPortal(null);
    }
  }

  async function handleReset() {
    setIsResetting(true);
    setNotice(null);
    setLoadError(null);

    try {
      await updatePreferences({ action: "reset" });
      setNotice("Portal preferences reset.");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to reset portal preferences.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            Portal selection
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Choose which CampusHub portal to enter.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            CampusHub is prepared for users with multiple roles. Your available
            portals are determined by assigned roles, while all supported portal
            types remain visible for future access requests and onboarding.
          </p>
          {notice ? (
            <div className="mt-5 flex gap-3 rounded-md border border-info/30 bg-info/10 p-4 text-sm">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-info"
                aria-hidden="true"
              />
              <p>{notice}</p>
            </div>
          ) : null}
          {loadError ? (
            <div className="mt-5 flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{loadError}</p>
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Role information</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPending
                  ? "Loading session"
                  : (user?.email ?? "Session pending")}
              </p>
            </div>
            <Button
              aria-label="Reset portal selection"
              size="icon"
              type="button"
              variant="ghost"
              disabled={isResetting || isLoadingPreferences}
              onClick={handleReset}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Assigned roles
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {userRoles.length > 0 ? (
                userRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                  >
                    {ROLE_LABELS[role]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No roles assigned
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Default portal
            </p>
            <p className="mt-2 text-sm font-medium">
              {defaultPortalDefinition?.title ?? "No default portal"}
            </p>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Last used portal
            </p>
            <p className="mt-2 text-sm font-medium">
              {lastUsed?.title ?? "No last used portal"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatSelectedAt(selectedAt)}
            </p>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Current selection
            </p>
            <p className="mt-2 text-sm font-medium">
              {selected?.title ?? "No portal selected"}
            </p>
          </div>
        </aside>
      </div>

      <section className="mb-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quick access</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pin up to three portals for faster access.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {quickAccessPortals.length > 0 ? (
            quickAccessPortals.map((portal) => {
              const isAvailable = canAccessPortal(userRoles, portal);
              const Icon = portal.icon;

              return (
                <Button
                  key={portal.key}
                  className={cn(
                    "h-auto flex-col items-start rounded-lg border border-border bg-background p-4 text-left text-foreground hover:border-primary hover:bg-background",
                    !isAvailable && "opacity-70",
                  )}
                  disabled={!isAvailable || Boolean(pendingPortal)}
                  variant="secondary"
                  type="button"
                  onClick={() => handleSelect(portal.key)}
                >
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold">{portal.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isAvailable ? "Available now" : "Requires role assignment"}
                  </p>
                </Button>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No quick access portals pinned.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Supported portals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select an available portal or review required role access.
            </p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {portalDefinitions.map((portal) => (
            <PortalCard
              key={portal.key}
              portal={portal}
              isAvailable={
                availablePortals.length > 0
                  ? availablePortals.includes(portal.key)
                  : canAccessPortal(userRoles, portal)
              }
              isLastUsed={lastUsedPortal === portal.key}
              isDefault={defaultPortal === portal.key}
              isQuickAccess={quickAccess.includes(portal.key)}
              isPending={pendingPortal === portal.key || isLoadingPreferences}
              onSelect={handleSelect}
              onSetDefault={handleSetDefault}
              onToggleQuickAccess={handleToggleQuickAccess}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
