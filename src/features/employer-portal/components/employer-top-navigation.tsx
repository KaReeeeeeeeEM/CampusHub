"use client";

import { FiSidebar } from "react-icons/fi";

import { AppearanceDrawer } from "@/components/navigation/appearance-drawer";
import { DashboardThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { EmployerBreadcrumbs } from "@/features/employer-portal/components/employer-breadcrumbs";
import { EmployerNotificationArea } from "@/features/employer-portal/components/employer-notification-area";
import { EmployerSearch } from "@/features/employer-portal/components/employer-search";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

function getUserName(user: AuthUser) {
  return (
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

export function EmployerTopNavigation({ user }: { user: AuthUser }) {
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);
  const toggleSidebarCollapsed = useNavigationStore(
    (state) => state.toggleSidebarCollapsed,
  );

  return (
    <header className="dashboard-topbar sticky top-0 z-30 border-b border-border">
      <div className="flex h-14 items-center">
        <div className="flex h-full w-14 shrink-0 items-center justify-center border-r border-border">
          <Button
            aria-label="Open employer navigation"
            className="lg:hidden"
            size="icon"
            type="button"
            variant="ghost"
            onClick={toggleSidebar}
          >
            <FiSidebar className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            aria-label="Collapse employer navigation"
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
          <EmployerBreadcrumbs />
        </div>
        <EmployerSearch className="ml-auto hidden max-w-sm flex-1 lg:flex" />
        <div className="flex items-center gap-1 px-3">
          <AppearanceDrawer />
          <DashboardThemeToggle />
          <EmployerNotificationArea />
          <UserMenu
            name={getUserName(user)}
            email={user.email}
            avatar={user.avatar}
            image={user.image}
          />
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 md:hidden">
        <EmployerBreadcrumbs />
      </div>
      <div className="border-t border-border px-4 py-3 lg:hidden">
        <EmployerSearch className="w-full" />
      </div>
    </header>
  );
}
