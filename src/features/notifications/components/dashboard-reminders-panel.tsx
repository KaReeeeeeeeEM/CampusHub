"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiBell, FiCalendar, FiClock, FiFlag, FiVolume2 } from "react-icons/fi";

import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ReminderKind = "almanac" | "event" | "announcement";

type DashboardReminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  meta: string;
  startsAt: string | null;
  priority: "normal" | "high" | "urgent";
  href: string;
};

type ApiEnvelope<T> = {
  data?: T | null;
};

type AlmanacApiItem = {
  id: string;
  title: string;
  eventType?: string | null;
  startDate?: string | null;
  isDeadline?: boolean | null;
};

type EventApiItem = {
  id: string;
  title: string;
  startDate?: string | null;
  venue?: string | null;
  eventType?: string | null;
  status?: string | null;
};

type AnnouncementApiItem = {
  id: string;
  title: string;
  priority?: string | null;
  category?: string | null;
  publishedAt?: string | null;
};

function basePathFor(pathname: string) {
  if (pathname.startsWith("/teacher")) return "/teacher";
  if (pathname.startsWith("/alumni")) return "/alumni";
  if (pathname.startsWith("/employer")) return "/employer";
  if (pathname.startsWith("/super-admin")) return "/super-admin";
  if (pathname.startsWith("/campus-admin")) return "/campus-admin";
  if (pathname.startsWith("/representative")) return "/representative";
  if (pathname.startsWith("/committee-member")) return "/committee-member";
  return "/student";
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWhen(value?: string | null) {
  const parsed = parseDate(value);
  if (!parsed) return "Date not set";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function readableLabel(value?: string | null) {
  return String(value ?? "General")
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

async function readJson<T>(response: Response) {
  if (!response.ok) return null;
  return (await response.json()) as ApiEnvelope<T>;
}

function iconFor(kind: ReminderKind) {
  if (kind === "announcement") return FiVolume2;
  if (kind === "event") return FiCalendar;
  return FiClock;
}

function useDashboardReminders(limit = 5) {
  const pathname = usePathname();
  const basePath = basePathFor(pathname);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<DashboardReminder[]>([]);

  useEffect(() => {
    let active = true;
    const now = new Date();
    const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    async function loadReminders() {
      setLoading(true);

      try {
        const [almanacPayload, eventPayload, announcementPayload] =
          await Promise.all([
            fetch("/api/almanac/upcoming", { cache: "no-store" }).then(
              (response) => readJson<{ events?: AlmanacApiItem[] }>(response),
            ),
            fetch(
              `/api/events?from=${encodeURIComponent(now.toISOString())}&includeCancelled=false`,
              { cache: "no-store" },
            ).then((response) => readJson<{ events?: EventApiItem[] }>(response)),
            fetch(
              `/api/announcements?status=PUBLISHED&from=${encodeURIComponent(recent.toISOString())}`,
              { cache: "no-store" },
            ).then((response) =>
              readJson<{ announcements?: AnnouncementApiItem[] }>(response),
            ),
          ]);

        if (!active) return;

        const almanac = (almanacPayload?.data?.events ?? [])
          .filter((item) => parseDate(item.startDate))
          .slice(0, 6)
          .map<DashboardReminder>((item) => ({
            id: `almanac-${item.id}`,
            kind: "almanac",
            title: item.title,
            meta: `${item.isDeadline ? "Deadline" : readableLabel(item.eventType)} · ${formatWhen(item.startDate)}`,
            startsAt: item.startDate ?? null,
            priority: item.isDeadline ? "high" : "normal",
            href: `${basePath}/almanac`,
          }));
        const events = (eventPayload?.data?.events ?? [])
          .filter((item) => parseDate(item.startDate))
          .slice(0, 6)
          .map<DashboardReminder>((item) => ({
            id: `event-${item.id}`,
            kind: "event",
            title: item.title,
            meta: `${readableLabel(item.eventType)} · ${formatWhen(item.startDate)}${item.venue ? ` · ${item.venue}` : ""}`,
            startsAt: item.startDate ?? null,
            priority: item.status === "FULL" ? "high" : "normal",
            href: `${basePath}/events`,
          }));
        const announcements = (announcementPayload?.data?.announcements ?? [])
          .slice(0, 4)
          .map<DashboardReminder>((item) => ({
            id: `announcement-${item.id}`,
            kind: "announcement",
            title: item.title,
            meta: `${readableLabel(item.category)} · ${formatWhen(item.publishedAt)}`,
            startsAt: item.publishedAt ?? null,
            priority:
              item.priority === "URGENT"
                ? "urgent"
                : item.priority === "HIGH"
                  ? "high"
                  : "normal",
            href: `${basePath}/announcements`,
          }));

        setReminders(
          [...almanac, ...events, ...announcements]
            .sort((a, b) => {
              if (a.priority === "urgent" && b.priority !== "urgent") return -1;
              if (b.priority === "urgent" && a.priority !== "urgent") return 1;

              return (
                (parseDate(a.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
                (parseDate(b.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER)
              );
            })
            .slice(0, limit),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadReminders();
    window.addEventListener("campushub:notifications-updated", loadReminders);

    return () => {
      active = false;
      window.removeEventListener(
        "campushub:notifications-updated",
        loadReminders,
      );
    };
  }, [basePath, limit]);

  const hasUrgent = useMemo(
    () => reminders.some((reminder) => reminder.priority === "urgent"),
    [reminders],
  );

  return { basePath, hasUrgent, loading, reminders };
}

export function DashboardRemindersList({
  className,
  emptyTitle = "No recent updates",
  emptyDescription = "Almanac entries, events, and announcements will appear here when scheduled or published.",
  limit = 5,
}: {
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  limit?: number;
}) {
  const { loading, reminders } = useDashboardReminders(limit);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true">
        {Array.from({ length: Math.min(limit, 3) }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 rounded-lg p-2">
            <Skeleton className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!reminders.length) {
    return (
      <div className={cn("rounded-lg border border-dashed border-border bg-surface-muted p-5 text-center", className)}>
        <FiFlag
          className="mx-auto h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-semibold">{emptyTitle}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {reminders.map((reminder) => {
        const Icon = iconFor(reminder.kind);
        const tone =
          reminder.priority === "urgent"
            ? "bg-destructive/10 text-destructive"
            : reminder.priority === "high"
              ? "bg-amber-500/10 text-amber-500"
              : "bg-primary/10 text-primary";

        return (
          <Link
            key={reminder.id}
            className="group flex items-start gap-3 rounded-lg p-2 transition hover:bg-surface-muted"
            href={reminder.href}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                tone,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold group-hover:text-primary">
                  {reminder.title}
                </span>
                {reminder.priority === "urgent" ? (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-destructive">
                    Urgent
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                {reminder.meta}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardRemindersPanel() {
  const { basePath, hasUrgent, loading, reminders } = useDashboardReminders();

  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiBell className="h-4 w-4" aria-hidden="true" />
            </span>
            Actionable Reminders
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Almanac entries, events, and announcements that need attention.
          </p>
        </div>
        {hasUrgent ? (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            Urgent
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <Skeleton className="h-8 w-8" />
                <Skeleton className="mt-4 h-4 w-3/4" />
                <Skeleton className="mt-3 h-3 w-full" />
              </div>
            ))}
          </div>
        ) : reminders.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {reminders.map((reminder) => {
              const Icon = iconFor(reminder.kind);
              const tone =
                reminder.priority === "urgent"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : reminder.priority === "high"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    : "border-primary/30 bg-primary/10 text-primary";

              return (
                <Link
                  key={reminder.id}
                  className="group rounded-lg border border-border bg-surface p-4 transition hover:border-primary/40 hover:bg-surface-raised"
                  href={reminder.href}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-md border ${tone}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {reminder.kind}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm font-semibold group-hover:text-primary">
                    {reminder.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {reminder.meta}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
            <FiFlag
              className="mx-auto h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold">No upcoming reminders</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Almanac entries, events, and announcements will appear here when
              they are scheduled or published.
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button asChild size="sm" variant="secondary">
            <Link href={`${basePath}/notifications`}>View all notifications</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
