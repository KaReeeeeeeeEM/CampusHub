"use client";

import Link from "next/link";
import { FiBell, FiCheckCircle } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockNotifications } from "@/features/student-portal/lib/mock-data";

export function StudentNotificationArea() {
  const unreadCount = mockNotifications.filter(
    (notification) => notification.unread,
  ).length;

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
          <p className="text-sm font-semibold">Notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {unreadCount} unread campus updates
          </p>
        </div>
        {mockNotifications.slice(0, 4).map((notification) => (
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
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
