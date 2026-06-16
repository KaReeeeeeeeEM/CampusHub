"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { DevelopmentRoleSwitcher } from "@/components/navigation/development-role-switcher";
import { SidebarNavTooltip } from "@/components/navigation/sidebar-nav-tooltip";
import { SidebarFooterCard } from "@/components/navigation/sidebar-footer-card";
import {
  isLegacyStudentLeadershipRoleKey,
  isRoleKey,
  isStudentLeadershipPosition,
  type StudentLeadershipPosition,
} from "@/features/authorization/roles";
import { useAuth } from "@/features/auth/auth-provider";
import {
  DEV_ROLE_PREVIEW_COOKIE,
  isRolePreviewKey,
  type RolePreviewKey,
} from "@/features/development/role-preview";
import {
  getVisibleStudentLeadershipNavigationItems,
  studentNavigationItems,
  type StudentLeadershipNavItem,
  type StudentNavItem,
} from "@/features/student-portal/lib/navigation";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";

function isActive(
  pathname: string,
  item: StudentNavItem | StudentLeadershipNavItem,
) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getLeadershipPositions(positions?: string[], roles?: string[]) {
  const explicit = positions?.filter(isStudentLeadershipPosition) ?? [];
  const legacy =
    roles
      ?.filter(isLegacyStudentLeadershipRoleKey)
      .filter(isStudentLeadershipPosition) ?? [];

  return Array.from(new Set([...explicit, ...legacy]));
}

function readDevelopmentPreviewRole() {
  if (typeof document === "undefined") {
    return null;
  }

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${DEV_ROLE_PREVIEW_COOKIE}=`))
    ?.split("=")[1];
  const decoded = value ? decodeURIComponent(value) : null;

  return isRolePreviewKey(decoded) ? decoded : null;
}

type StudentSidebarProps = {
  className?: string;
};

export function StudentSidebar({ className }: StudentSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const collapsed = useNavigationStore((state) => state.sidebarCollapsed);
  const [previewRole, setPreviewRole] = useState<RolePreviewKey | null>(null);
  const userRoles = useMemo(
    () => (user?.roles?.length ? user.roles : user?.role ? [user.role] : []),
    [user?.role, user?.roles],
  );
  const canUsePreview =
    process.env.NODE_ENV !== "production" &&
    userRoles.some(isRoleKey) &&
    userRoles.includes("SUPER_ADMIN");
  const leadershipPositions = useMemo<StudentLeadershipPosition[]>(() => {
    if (
      canUsePreview &&
      previewRole &&
      isStudentLeadershipPosition(previewRole)
    ) {
      return [previewRole];
    }

    return getLeadershipPositions(user?.studentLeadershipPositions, user?.roles);
  }, [canUsePreview, previewRole, user?.roles, user?.studentLeadershipPositions]);
  const leadershipItems = getVisibleStudentLeadershipNavigationItems(
    leadershipPositions,
  );
  const leadershipSections = ["Leadership", "My Committee"] as const;

  useEffect(() => {
    const syncPreviewRole = () => setPreviewRole(readDevelopmentPreviewRole());

    syncPreviewRole();
    window.addEventListener("campushub:dev-role-preview", syncPreviewRole);

    return () =>
      window.removeEventListener(
        "campushub:dev-role-preview",
        syncPreviewRole,
      );
  }, []);

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
          href="/student/dashboard"
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
            <span className="block text-sm font-semibold leading-tight">
              CampusHub
            </span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              Student Portal
            </span>
          </span>
        </Link>
        <div className={cn("mt-3", collapsed && "lg:hidden")}>
          <Suspense fallback={null}>
            <DevelopmentRoleSwitcher />
          </Suspense>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto">
        <p
          className={cn(
            "px-2 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
            collapsed && "lg:hidden",
          )}
        >
          Workspace
        </p>
        {studentNavigationItems.map((item) => {
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
        {leadershipSections.map((section) => {
          const sectionItems = leadershipItems.filter(
            (item) => item.section === section,
          );

          if (sectionItems.length === 0) {
            return null;
          }

          return (
            <div key={section} className="pt-4">
              <p
                className={cn(
                  "px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                  collapsed && "lg:hidden",
                )}
              >
                {section}
              </p>
              <div className="mt-2 space-y-1">
                {sectionItems.map((item) => {
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
                        active
                          ? "dashboard-nav-item-active"
                          : "text-muted-foreground",
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
              </div>
            </div>
          );
        })}
      </nav>
      <SidebarFooterCard
        className={cn("mt-4", collapsed && "lg:hidden")}
        email={user?.email ?? "student@campushub.com"}
        name={user?.name ?? "Faith Mollel"}
        profileHref="/student/profile"
        streakLabel="Campus Streak"
      />
    </aside>
  );
}
