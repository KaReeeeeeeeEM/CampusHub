"use client";

import { FiSidebar } from "react-icons/fi";

import { AppearanceDrawer } from "@/components/navigation/appearance-drawer";
import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { DashboardThemeToggle } from "@/components/navigation/theme-toggle";
import { UniversityScopeBadge } from "@/components/navigation/university-scope-badge";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { CampusAdminBreadcrumbs } from "@/features/campus-admin/components/campus-admin-breadcrumbs";
import { CampusAdminMobileMenu } from "@/features/campus-admin/components/campus-admin-mobile-menu";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

type CampusAdminTopbarProps = {
  user: AuthUser;
};

export function CampusAdminTopbar({ user }: CampusAdminTopbarProps) {
  const toggleSidebarCollapsed = useNavigationStore(
    (state) => state.toggleSidebarCollapsed,
  );

  return (
    <header className="dashboard-topbar sticky top-0 z-30 flex h-14 items-center border-b border-border">
      <div className="flex h-full w-14 shrink-0 items-center justify-center border-r border-border">
        <CampusAdminMobileMenu />
        <Button
          aria-label="Collapse Campus Admin navigation"
          className="hidden lg:inline-flex"
          size="icon"
          type="button"
          variant="ghost"
          onClick={toggleSidebarCollapsed}
        >
          <FiSidebar className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="h-full border-r border-border">
        <CampusAdminBreadcrumbs />
      </div>
      <UniversityScopeBadge
        universityId={user.universityId}
        className="mx-3 hidden min-w-0 md:flex"
      />
      <Search
        className="ml-auto hidden max-w-sm flex-1 lg:flex"
        placeholder="Search campus"
      />
      <div className="flex items-center gap-1 px-3">
        <AppearanceDrawer />
        <DashboardThemeToggle />
        <NotificationMenu />
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
