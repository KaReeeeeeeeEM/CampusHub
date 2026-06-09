"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const notifications = [
  {
    title: "Portal foundation ready",
    description: "Student navigation and shell architecture are active.",
  },
  {
    title: "Modules coming soon",
    description: "Announcements, events, and opportunities are placeholders.",
  },
];

export function StudentNotificationArea() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          aria-label="Open student notifications"
          size="icon"
          variant="ghost"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 w-80 rounded-lg border border-border bg-surface p-2 text-foreground shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">Student notifications</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Notification architecture placeholder.
            </p>
          </div>
          <div className="mt-1 grid gap-1">
            {notifications.map((notification) => (
              <div
                key={notification.title}
                className="flex gap-3 rounded-md px-3 py-2 text-sm"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {notification.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
