"use client";

import { FiBell } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open notifications" size="icon" variant="ghost">
          <FiBell className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">
            Notification infrastructure placeholder.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
