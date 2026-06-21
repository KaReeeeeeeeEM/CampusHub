"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

import { KIBO_CONFIG } from "../config";
import { KiboAvatar } from "./KiboAvatar";

const dashboardPrefixes = [
  "/dashboard",
  "/student",
  "/teacher",
  "/alumni",
  "/employer",
  "/campus-admin",
  "/representative",
  "/committee-member",
  "/super-admin",
];

type AssistantState = {
  dismissed?: boolean;
  minimized?: boolean;
};

function roleLabel(role?: string | null) {
  if (!role) return "CampusHub";

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function KiboAssistant() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<AssistantState>({});
  const [badgeCount, setBadgeCount] = useState(0);

  const dashboardPath = useMemo(
    () => dashboardPrefixes.some((prefix) => pathname?.startsWith(prefix)),
    [pathname],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      setState(
        JSON.parse(
          window.localStorage.getItem(KIBO_CONFIG.assistantStorageKey) ?? "{}",
        ) as AssistantState,
      );
    } catch {
      setState({});
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function loadCount() {
      try {
        const response = await fetch("/api/reward-events/unseen-count", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          data?: { count?: number };
        };

        if (!cancelled && response.ok) {
          setBadgeCount(Number(payload.data?.count ?? 0));
        }
      } catch {
        if (!cancelled) setBadgeCount(0);
      }
    }

    void loadCount();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function persist(next: AssistantState) {
    setState(next);
    window.localStorage.setItem(
      KIBO_CONFIG.assistantStorageKey,
      JSON.stringify(next),
    );
  }

  if (!isAuthenticated || !dashboardPath || state.dismissed) return null;

  return (
    <aside
      className={cn(
        "fixed bottom-4 right-4 z-[120] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur",
        state.minimized && "w-auto rounded-full p-2",
      )}
      aria-label="Kibo assistant"
    >
      {state.minimized ? (
        <button
          type="button"
          className="relative block"
          aria-label="Open Kibo assistant"
          onClick={() => persist({ ...state, minimized: false })}
        >
          <KiboAvatar mood="happy" size="sm" />
          {badgeCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {badgeCount}
            </span>
          ) : null}
        </button>
      ) : (
        <div className="flex gap-3">
          <div className="relative shrink-0">
            <KiboAvatar mood="happy" size="sm" />
            {badgeCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                {badgeCount}
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Kibo</p>
                <p className="text-xs text-muted-foreground">
                  {roleLabel(user?.role)} companion
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Minimize Kibo"
                  className="h-8 w-8"
                  onClick={() => persist({ ...state, minimized: true })}
                >
                  <FiChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Dismiss Kibo"
                  className="h-8 w-8"
                  onClick={() => persist({ ...state, dismissed: true })}
                >
                  <FiX className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-background/70 p-3">
              <p className="text-sm leading-5">
                {badgeCount > 0
                  ? `You have ${badgeCount} new reward ${
                      badgeCount === 1 ? "moment" : "moments"
                    } waiting.`
                  : "I will only appear for milestones, achievements, and important updates."}
              </p>
            </div>
          </div>
        </div>
      )}
      <span className="sr-only">
        <FiChevronUp aria-hidden="true" />
      </span>
    </aside>
  );
}
