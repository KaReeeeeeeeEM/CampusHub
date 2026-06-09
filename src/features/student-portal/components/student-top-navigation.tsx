"use client";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/navigation/user-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { StudentBreadcrumbs } from "@/features/student-portal/components/student-breadcrumbs";
import { StudentNotificationArea } from "@/features/student-portal/components/student-notification-area";
import { StudentSearch } from "@/features/student-portal/components/student-search";
import { useNavigationStore } from "@/store/navigation-store";

export function StudentTopNavigation() {
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          aria-label="Toggle student navigation"
          className="lg:hidden"
          size="icon"
          type="button"
          variant="ghost"
          onClick={toggleSidebar}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="hidden min-w-0 md:block">
          <StudentBreadcrumbs />
        </div>
        <StudentSearch className="ml-auto hidden max-w-md flex-1 lg:flex" />
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <StudentNotificationArea />
          <UserMenu name={user?.name} email={user?.email} />
        </div>
      </div>
      <div className="border-t border-border px-4 py-3 md:hidden">
        <StudentBreadcrumbs />
      </div>
      <div className="border-t border-border px-4 py-3 lg:hidden">
        <StudentSearch className="w-full" />
      </div>
    </header>
  );
}
