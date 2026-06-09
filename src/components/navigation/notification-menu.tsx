"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button aria-label="Open notifications" size="icon" variant="ghost">
          <Bell className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 w-80 rounded-lg border border-border bg-surface p-2 text-foreground shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">
              Notification infrastructure placeholder.
            </p>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
