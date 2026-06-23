"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBell, FiCheckCircle, FiTrash2 } from "react-icons/fi";

import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  type: string;
  status: "UNREAD" | "READ" | "ARCHIVED" | string;
  actionUrl?: string | null;
  createdAt?: string | null;
};

type NotificationPayload = {
  data?: {
    notifications?: NotificationRecord[];
  } | null;
  error?: {
    message?: string;
  } | null;
};

const NOTIFICATION_PREVIEW_LIMIT = 5;

function formatNotificationTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function resolveNotificationsHref(pathname: string) {
  if (pathname.startsWith("/teacher")) return "/teacher/notifications";
  if (pathname.startsWith("/alumni")) return "/alumni/notifications";
  if (pathname.startsWith("/employer")) return "/employer/notifications";
  if (pathname.startsWith("/super-admin")) return "/super-admin/notifications";
  return "/student/notifications";
}

function TooltipIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <Button
        aria-label={label}
        className="h-9 w-9"
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
        size="icon"
        title={label}
        type="button"
        variant="secondary"
      >
        {children}
      </Button>
      <span
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

export function NotificationMenu() {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const notificationsHref = resolveNotificationsHref(pathname);
  const previewNotifications = notifications.slice(0, NOTIFICATION_PREVIEW_LIMIT);
  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => notification.status === "UNREAD")
        .length,
    [notifications],
  );

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications?limit=100", {
          cache: "no-store",
        });
        const payload = (await response.json()) as NotificationPayload;

        if (!active) return;

        if (!response.ok) {
          setNotifications([]);
          return;
        }

        setNotifications(payload.data?.notifications ?? []);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadNotifications();

    window.addEventListener(
      "campushub:notifications-updated",
      loadNotifications,
    );
    const interval = window.setInterval(loadNotifications, 30000);

    return () => {
      active = false;
      window.removeEventListener(
        "campushub:notifications-updated",
        loadNotifications,
      );
      window.clearInterval(interval);
    };
  }, []);

  async function markRead(notification: NotificationRecord) {
    if (notification.status !== "UNREAD") return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, status: "READ" } : item,
      ),
    );

    await fetch(`/api/notifications/${notification.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  }

  async function markAllRead() {
    if (unreadCount === 0) return;

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, status: "READ" })),
    );

    await fetch("/api/notifications/mark-all-read", {
      method: "PATCH",
    });
  }

  async function clearAllNotifications() {
    if (notifications.length === 0) return;

    setNotifications([]);

    await fetch("/api/notifications/clear-all", {
      method: "DELETE",
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open notifications"
          className="relative bg-surface-muted"
          size="icon"
          variant="secondary"
        >
          <FiBell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
              : "Recent CampusHub updates"}
          </p>
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div
            className="space-y-3 px-3 py-3"
            aria-busy="true"
            aria-label="Loading notifications"
          >
            <span className="sr-only">Loading notifications</span>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : previewNotifications.length > 0 ? (
          previewNotifications.map((notification) => {
            const content = (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {notification.title}
                  </p>
                  {notification.status === "UNREAD" ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {notification.message}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {notification.type}
                  {notification.createdAt
                    ? ` • ${formatNotificationTime(notification.createdAt)}`
                    : ""}
                </p>
              </div>
            );

            return notification.actionUrl ? (
              <DropdownMenuItem key={notification.id} asChild>
                <Link
                  href={notification.actionUrl}
                  onClick={() => void markRead(notification)}
                >
                  {content}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => void markRead(notification)}
              >
                {content}
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2 px-2 py-2">
          <Button asChild className="flex-1" size="sm" variant="secondary">
            <Link href={notificationsHref}>View all</Link>
          </Button>
          <TooltipIconButton
            disabled={unreadCount === 0}
            label="Mark all as read"
            onClick={() => void markAllRead()}
          >
            <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
          </TooltipIconButton>
          <TooltipIconButton
            disabled={notifications.length === 0}
            label="Clear all notifications"
            onClick={() => void clearAllNotifications()}
          >
            <FiTrash2 className="h-4 w-4" aria-hidden="true" />
          </TooltipIconButton>
        </div>
        {notifications.length > NOTIFICATION_PREVIEW_LIMIT ? (
          <p className="px-3 pb-2 text-center text-[11px] text-muted-foreground">
            Showing latest {NOTIFICATION_PREVIEW_LIMIT} of{" "}
            {notifications.length}.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
