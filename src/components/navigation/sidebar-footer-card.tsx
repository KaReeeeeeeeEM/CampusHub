"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaFire } from "react-icons/fa6";
import { FiChevronRight, FiGlobe } from "react-icons/fi";

import { cn } from "@/lib/utils";

type SidebarFooterCardProps = {
  name: string;
  email: string;
  domain?: string;
  streakLabel?: string;
  profileHref?: string;
  className?: string;
};

type WeeklyActivityDay = {
  label: string;
  date: string;
  active: boolean;
  isToday: boolean;
};

type StreakSummary = {
  currentCount: number;
  longestCount: number;
  status: string;
  activeDaysThisWeek: number;
  weekGoal: number;
  progressPercent: number;
  weeklyActivity: WeeklyActivityDay[];
  recoveryTokens: number;
};

type StreakSummaryResponse = {
  data?: {
    summary?: StreakSummary;
  };
  error?: {
    message?: string;
  } | null;
};

const defaultWeekActivity = ["M", "T", "W", "T", "F", "S", "S"].map(
  (label) => ({
    label,
    date: "",
    active: false,
    isToday: false,
  }),
);

export function SidebarFooterCard({
  name,
  email,
  domain = "campushub.com",
  streakLabel = "Campus Streak",
  profileHref = "/dashboard",
  className,
}: SidebarFooterCardProps) {
  const [summary, setSummary] = useState<StreakSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/streaks/summary", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as StreakSummaryResponse;

      if (!response.ok || payload.error) {
        setSummary(null);
        return;
      }

      setSummary(payload.data?.summary ?? null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!cancelled) {
        await loadSummary();
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  useEffect(() => {
    const refresh = () => void loadSummary();

    window.addEventListener("campushub:streak-updated", refresh);

    return () => window.removeEventListener("campushub:streak-updated", refresh);
  }, [loadSummary]);

  const weeklyActivity = summary?.weeklyActivity?.length
    ? summary.weeklyActivity
    : defaultWeekActivity;
  const currentCount = summary?.currentCount ?? 0;
  const activeDaysThisWeek = summary?.activeDaysThisWeek ?? 0;
  const weekGoal = summary?.weekGoal ?? 7;
  const progressPercent = summary?.progressPercent ?? 0;
  const streakDays = loading
    ? "Loading"
    : currentCount === 1
      ? "1 day"
      : `${currentCount} days`;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl bg-surface-muted p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <FaFire
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {streakLabel}
            </p>
          </div>
          <p className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
            {streakDays}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-medium">
          {weeklyActivity.map((day, index) => (
            <span key={`${day.label}-${day.date || index}`}>{day.label}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {weeklyActivity.map((day, index) => {
            return (
              <span
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full text-[10px]",
                  day.active
                    ? "bg-primary/15 text-primary"
                    : day.isToday
                      ? "bg-primary/5 text-primary"
                      : "bg-background text-muted-foreground",
                )}
                key={`${day.label}-dot-${day.date || index}`}
              >
                {day.active ? "•" : ""}
              </span>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-4 text-center text-xs font-semibold">
          {activeDaysThisWeek} of {weekGoal} days this week
        </p>
      </div>

      <Link
        className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary"
        href="/"
      >
        <FiGlobe className="h-4 w-4" aria-hidden="true" />
        {domain}
      </Link>

      <Link
        className="flex items-center gap-3 border-t border-border px-1 pt-4"
        href={profileHref}
      >
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-primary/80 to-pink-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-muted-foreground">
            {name}
          </span>
          <span className="block truncate text-xs font-semibold">{email}</span>
        </span>
        <FiChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
