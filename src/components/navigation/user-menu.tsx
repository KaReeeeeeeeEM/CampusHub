"use client";

import * as Avatar from "@radix-ui/react-avatar";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

import { Button } from "@/components/ui/button";

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
};

export function UserMenu({ name, email }: UserMenuProps) {
  const initials = name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button aria-label="Open user menu" size="icon" variant="ghost">
          <Avatar.Root className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            <Avatar.Fallback>{initials || "CH"}</Avatar.Fallback>
          </Avatar.Root>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 w-64 rounded-lg border border-border bg-surface p-2 text-foreground shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{name || "CampusHub User"}</p>
            {email ? (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className="flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm outline-none focus:bg-background">
            <User className="h-4 w-4" aria-hidden="true" />
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm outline-none focus:bg-background">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className="flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive outline-none focus:bg-background">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
