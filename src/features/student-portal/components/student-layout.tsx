"use client";

import { DashboardPageTransition } from "@/components/motion/dashboard-page-transition";
import { DashboardIntroTour } from "@/components/onboarding/dashboard-intro-tour";
import { StudentSidebar } from "@/features/student-portal/components/student-sidebar";
import { StudentTopNavigation } from "@/features/student-portal/components/student-top-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

type StudentLayoutProps = {
  children: React.ReactNode;
  user: AuthUser;
};

export function StudentLayout({ children, user }: StudentLayoutProps) {
  const sidebarOpen = useNavigationStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useNavigationStore(
    (state) => state.sidebarCollapsed,
  );
  const setSidebarOpen = useNavigationStore((state) => state.setSidebarOpen);

  return (
    <div className="dashboard-shell min-h-screen text-foreground">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <StudentSidebar user={user} />
      </div>
      {sidebarOpen ? (
        <Button
          aria-label="Close student navigation"
          className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-background/70 p-0 backdrop-blur-sm hover:bg-background/70 lg:hidden"
          type="button"
          variant="ghost"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className={cn("lg:p-2", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        <div className="dashboard-app-frame">
          <StudentTopNavigation user={user} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <DashboardPageTransition>{children}</DashboardPageTransition>
          </main>
          <DashboardIntroTour
            role="Student"
            storageKey="campushub:intro:student-dashboard"
          />
        </div>
      </div>
    </div>
  );
}
