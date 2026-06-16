"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { DevelopmentRoleSwitcher } from "@/components/navigation/development-role-switcher";
import { SidebarNavTooltip } from "@/components/navigation/sidebar-nav-tooltip";
import { SidebarFooterCard } from "@/components/navigation/sidebar-footer-card";
import {
  superAdminNavItems,
  superAdminWorkspace,
} from "@/features/super-admin/components/super-admin-navigation";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const WorkspaceIcon = superAdminWorkspace.icon;
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
        href="/super-admin/dashboard"
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
          CampusHub
          <span className="block text-[11px] font-normal leading-tight text-muted-foreground">
            Super Admin
          </span>
        </span>
      </Link>

      <div className={cn(collapsed && "hidden")}>
        <Suspense fallback={null}>
          <DevelopmentRoleSwitcher />
        </Suspense>
      </div>

      <div className={cn("dashboard-panel mb-4 p-3", collapsed && "hidden")}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <WorkspaceIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium">{superAdminWorkspace.label}</p>
            <p className="text-xs text-muted-foreground">Platform control</p>
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
        {superAdminNavItems.map((item) => {
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
        email="admin@campushub.com"
        name="CampusHub Admin"
        profileHref="/super-admin/settings"
        streakLabel="Setup Streak"
      />
    </aside>
  );
}
