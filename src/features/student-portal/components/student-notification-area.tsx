"use client";

import Link from "next/link";
import { useState } from "react";
import { FiBell, FiCheckCircle, FiTrash2 } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockNotifications } from "@/features/student-portal/lib/mock-data";

export function StudentNotificationArea() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unreadCount = notifications.filter(
    (notification) => notification.unread,
  ).length;
  const previewNotifications = notifications.slice(0, 4);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open student notifications"
          className="relative"
          size="icon"
          variant="ghost"
        >
          <FiBell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {unreadCount} unread campus updates
              </p>
            </div>
            <Button
              asChild
              className="h-7 px-2 text-[11px] font-semibold"
              size="sm"
              variant="ghost"
            >
              <Link href="/student/notifications">View all</Link>
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              className="h-8 w-full gap-1.5 px-2 text-[11px] font-semibold"
              disabled={unreadCount === 0}
              size="sm"
              type="button"
              variant="secondary"
              onClick={() =>
                setNotifications((current) =>
                  current.map((notification) => ({
                    ...notification,
                    unread: false,
                  })),
                )
              }
            >
              <FiCheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Mark read
            </Button>
            <Button
              className="h-8 w-full gap-1.5 px-2 text-[11px] font-semibold"
              disabled={notifications.length === 0}
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => setNotifications([])}
            >
              <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </Button>
          </div>
        </div>
        {previewNotifications.length > 0 ? (
          previewNotifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <Link
                className="flex items-start gap-3 rounded-md px-2 py-2"
                href="/student/notifications"
              >
                <FiCheckCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-medium">
                    {notification.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {notification.description}
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground">
            No notifications to show.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
