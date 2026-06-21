"use client";

import * as Avatar from "@radix-ui/react-avatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut, FiSettings, FiUser } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { usePortalSelectionStore } from "@/store/portal-selection-store";
import { useUserStore } from "@/store/user-store";

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  image?: string | null;
};

function resolveAccountLinks(pathname: string) {
  if (pathname.startsWith("/campus-admin")) {
    return {
      profile: "/campus-admin/profile",
      settings: "/campus-admin/settings",
    };
  }

  if (pathname.startsWith("/teacher")) {
    return { profile: "/teacher/profile", settings: "/teacher/profile" };
  }

  if (pathname.startsWith("/alumni")) {
    return { profile: "/alumni/profile", settings: "/alumni/profile" };
  }

  if (pathname.startsWith("/employer")) {
    return { profile: "/employer/profile", settings: "/employer/profile" };
  }

  if (pathname.startsWith("/committee-member")) {
    return {
      profile: "/committee-member/profile",
      settings: "/committee-member/profile",
    };
  }

  if (pathname.startsWith("/representative")) {
    return {
      profile: "/representative/settings",
      settings: "/representative/settings",
    };
  }

  if (pathname.startsWith("/super-admin")) {
    return {
      profile: "/super-admin/settings",
      settings: "/super-admin/settings",
    };
  }

  return { profile: "/student/profile", settings: "/student/profile" };
}

export function UserMenu({ name, email, avatar, image }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const storedUser = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const resetPortalSelection = usePortalSelectionStore(
    (state) => state.resetPortalSelection,
  );
  const displayName = name ?? storedUser?.name;
  const displayEmail = email ?? storedUser?.email;
  const avatarUrl = avatar || image || storedUser?.avatar || storedUser?.image || null;
  const initials = displayName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const accountLinks = resolveAccountLinks(pathname);

  function clearClientSessionState() {
    clearUser();
    resetPortalSelection();
    usePortalSelectionStore.persist.clearStorage();
    document.cookie = "campushub-dev-role-preview=; Max-Age=0; path=/; SameSite=Lax";
  }

  async function handleSignOut() {
    try {
      await authClient.signOut();
    } finally {
      clearClientSessionState();
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open user menu"
          className="bg-surface-muted"
          size="icon"
          variant="secondary"
        >
          <Avatar.Root className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {avatarUrl ? (
              <Avatar.Image
                src={avatarUrl}
                alt={
                  displayName ? `${displayName} profile photo` : "Profile photo"
                }
                className="h-full w-full object-cover"
              />
            ) : null}
            <Avatar.Fallback>{initials || "CH"}</Avatar.Fallback>
          </Avatar.Root>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">
            {displayName || "CampusHub User"}
          </p>
          {displayEmail ? (
            <p className="truncate text-xs text-muted-foreground">
              {displayEmail}
            </p>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={accountLinks.profile}>
            <FiUser className="h-4 w-4" aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={accountLinks.settings}>
            <FiSettings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          <FiLogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
