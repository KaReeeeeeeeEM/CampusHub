"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarNavTooltip } from "@/components/navigation/sidebar-nav-tooltip";
import { SidebarFooterCard } from "@/components/navigation/sidebar-footer-card";
import { useAuth } from "@/features/auth/auth-provider";
import {
  campusAdminNavItems,
  campusAdminWorkspace,
} from "@/features/campus-admin/components/campus-admin-navigation";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

function getUserName(user: AuthUser | null | undefined) {
  return (
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Campus Admin"
  );
}

export function CampusAdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const WorkspaceIcon = campusAdminWorkspace.icon;
  const collapsed = useNavigationStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "dashboard-sidebar hidden h-screen w-64 shrink-0 border-r border-border p-3 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:flex-col",
        collapsed && "w-16",
      )}
    >
      <Link
        className={cn(
          "mb-4 flex items-center gap-2.5 rounded-lg px-1 py-2",
          collapsed && "justify-center",
        )}
        href="/campus-admin/dashboard"
      >
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="32px"
            priority
          />
        </span>
        <span
          className={cn(
            "min-w-0 text-sm font-semibold leading-5",
            collapsed && "hidden",
          )}
        >
          <span className="campushub-logo-text">CampusHub</span>
          <span className="block text-[11px] font-normal leading-tight text-muted-foreground">
            Campus Admin
          </span>
        </span>
      </Link>

      <div className={cn("dashboard-panel mb-4 p-3", collapsed && "hidden")}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <WorkspaceIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium">{campusAdminWorkspace.label}</p>
            <p className="text-xs text-muted-foreground">University control</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        <p
          className={cn(
            "px-2 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
            collapsed && "hidden",
          )}
        >
          Workspace
        </p>
        {campusAdminNavItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <SidebarNavTooltip
              key={item.href}
              label={item.label}
              enabled={collapsed}
            >
            <Link
              aria-label={item.label}
              className={cn(
                "dashboard-nav-item flex h-9 items-center gap-2 px-2 text-sm transition-colors",
                collapsed && "justify-center",
                active ? "dashboard-nav-item-active" : "text-muted-foreground",
              )}
              href={item.href}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={cn("truncate", collapsed && "hidden")}>
                {item.label}
              </span>
            </Link>
            </SidebarNavTooltip>
          );
        })}
      </nav>
      <SidebarFooterCard
        className={cn("mt-auto", collapsed && "hidden")}
        email={user?.email ?? "campus-admin@campushub.com"}
        name={getUserName(user)}
        profileHref="/campus-admin/profile"
        streakLabel="Campus Streak"
      />
    </aside>
  );
}
