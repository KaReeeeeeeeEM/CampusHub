"use client";

import { FiSidebar } from "react-icons/fi";

import { AppearanceDrawer } from "@/components/navigation/appearance-drawer";
import { DashboardThemeToggle } from "@/components/navigation/theme-toggle";
import { UniversityScopeBadge } from "@/components/navigation/university-scope-badge";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/navigation/user-menu";
import { StudentBreadcrumbs } from "@/features/student-portal/components/student-breadcrumbs";
import { StudentNotificationArea } from "@/features/student-portal/components/student-notification-area";
import { StudentSearch } from "@/features/student-portal/components/student-search";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

function getUserName(user: AuthUser) {
  return (
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

export function StudentTopNavigation({ user }: { user: AuthUser }) {
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);
  const toggleSidebarCollapsed = useNavigationStore(
    (state) => state.toggleSidebarCollapsed,
  );

  return (
    <header className="dashboard-topbar sticky top-0 z-30 border-b border-border">
      <div className="flex h-14 items-center">
        <div className="flex h-full w-14 shrink-0 items-center justify-center border-r border-border">
          <Button
            aria-label="Open student navigation"
            className="lg:hidden"
            size="icon"
            type="button"
            variant="ghost"
            onClick={toggleSidebar}
          >
            <FiSidebar className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Collapse student navigation"
            className="hidden lg:inline-flex"
            size="icon"
            type="button"
            variant="ghost"
            onClick={toggleSidebarCollapsed}
          >
            <FiSidebar className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="hidden h-full min-w-0 border-r border-border md:block">
          <StudentBreadcrumbs />
        </div>
        <UniversityScopeBadge
          universityId={user.universityId}
          className="mx-3 hidden min-w-0 md:flex"
        />
        <StudentSearch className="ml-auto hidden max-w-sm flex-1 lg:flex" />
        <div className="flex items-center gap-1 px-3">
          <AppearanceDrawer />
          <DashboardThemeToggle />
          <StudentNotificationArea />
          <UserMenu
            name={getUserName(user)}
            email={user.email}
            avatar={user.avatar}
            image={user.image}
          />
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 md:hidden">
        <StudentBreadcrumbs />
        <UniversityScopeBadge
          universityId={user.universityId}
          className="mt-3 max-w-full"
        />
      </div>
      <div className="border-t border-border px-4 py-3 lg:hidden">
        <StudentSearch className="w-full" />
      </div>
    </header>
  );
}
