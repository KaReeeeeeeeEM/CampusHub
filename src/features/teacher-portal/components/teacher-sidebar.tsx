"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarFooterCard } from "@/components/navigation/sidebar-footer-card";
import { SidebarNavTooltip } from "@/components/navigation/sidebar-nav-tooltip";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";
import {
  teacherNavigationItems,
  type TeacherNavItem,
} from "@/features/teacher-portal/lib/navigation";
import type { AuthUser } from "@/types/auth";

function isActive(pathname: string, item: TeacherNavItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type TeacherSidebarProps = {
  className?: string;
  user: AuthUser;
};

function getUserName(user: AuthUser) {
  return (
    user.name ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    user.email
  );
}

export function TeacherSidebar({ className, user }: TeacherSidebarProps) {
  const pathname = usePathname();
  const collapsed = useNavigationStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "dashboard-sidebar flex h-full w-64 flex-col border-r border-border p-3 transition-[width] duration-200 lg:w-64",
        collapsed && "lg:w-16",
        className,
      )}
    >
      <div className="pb-4">
        <Link
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-1 py-2",
            collapsed && "lg:justify-center",
          )}
          href="/teacher/dashboard"
        >
          <span className="relative h-8 w-8 overflow-hidden rounded-md">
            <Image
              src="/logo.png"
              alt="CampusHub logo"
              fill
              className="object-contain"
              sizes="32px"
              priority
            />
          </span>
          <span className={cn(collapsed && "lg:hidden")}>
            <span className="campushub-logo-text block text-sm font-semibold leading-tight">
              CampusHub
            </span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              Teacher Portal
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <p
          className={cn(
            "px-2 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
            collapsed && "lg:hidden",
          )}
        >
          Academic Hub
        </p>
        {teacherNavigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item);

          return (
            <SidebarNavTooltip
              key={item.key}
              label={item.label}
              enabled={collapsed}
            >
              <Link
                aria-label={item.label}
                className={cn(
                  "dashboard-nav-item group flex h-9 items-center justify-between gap-2 px-2 text-sm transition-colors",
                  collapsed && "lg:justify-center",
                  active ? "dashboard-nav-item-active" : "text-muted-foreground",
                )}
                href={item.href}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className={cn("truncate", collapsed && "lg:hidden")}>
                    {item.label}
                  </span>
                </span>
              </Link>
            </SidebarNavTooltip>
          );
        })}
      </nav>

      <SidebarFooterCard
        className={cn("mt-4", collapsed && "lg:hidden")}
        email={user.email}
        name={getUserName(user)}
        profileHref="/teacher/profile"
        streakLabel="Academic Streak"
      />
    </aside>
  );
}
