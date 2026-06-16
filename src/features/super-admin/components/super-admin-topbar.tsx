"use client";

import Link from "next/link";
import { FiSidebar } from "react-icons/fi";

import { AppearanceDrawer } from "@/components/navigation/appearance-drawer";
import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { DashboardThemeToggle } from "@/components/navigation/theme-toggle";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { SuperAdminBreadcrumbs } from "@/features/super-admin/components/super-admin-breadcrumbs";
import { SuperAdminMobileMenu } from "@/features/super-admin/components/super-admin-mobile-menu";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

type SuperAdminTopbarProps = {
  user: AuthUser;
};

export function SuperAdminTopbar({ user }: SuperAdminTopbarProps) {
  const toggleSidebarCollapsed = useNavigationStore(
    (state) => state.toggleSidebarCollapsed,
  );

  return (
    <header className="dashboard-topbar sticky top-0 z-30 flex h-14 items-center border-b border-border">
      <div className="flex h-full w-14 shrink-0 items-center justify-center border-r border-border">
        <SuperAdminMobileMenu />
        <Button
          aria-label="Collapse Super Admin navigation"
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
        <SuperAdminBreadcrumbs />
      </div>
      <Search
        className="ml-auto hidden max-w-sm flex-1 lg:flex"
        placeholder="Search platform"
      />
      <div className="flex items-center gap-1 px-3">
        <AppearanceDrawer />
        <DashboardThemeToggle />
        <NotificationMenu />
        <Button asChild className="hidden sm:inline-flex" variant="default">
          <Link href="/super-admin/universities">Manage Universities</Link>
        </Button>
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
