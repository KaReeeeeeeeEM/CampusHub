"use client";

import type { ReactNode } from "react";

import { DashboardPageTransition } from "@/components/motion/dashboard-page-transition";
import { DashboardIntroTour } from "@/components/onboarding/dashboard-intro-tour";
import { Button } from "@/components/ui/button";
import { AlumniSidebar } from "@/features/alumni-portal/components/alumni-sidebar";
import { AlumniTopNavigation } from "@/features/alumni-portal/components/alumni-top-navigation";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";
import type { AuthUser } from "@/types/auth";

type AlumniLayoutProps = {
  children: ReactNode;
  user: AuthUser;
};

export function AlumniLayout({ children, user }: AlumniLayoutProps) {
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
        <AlumniSidebar user={user} />
      </div>
      {sidebarOpen ? (
        <Button
          aria-label="Close alumni navigation"
          className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-background/70 p-0 backdrop-blur-sm hover:bg-background/70 lg:hidden"
          type="button"
          variant="ghost"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className={cn("lg:p-2", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
        <div className="dashboard-app-frame">
          <AlumniTopNavigation user={user} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <DashboardPageTransition>{children}</DashboardPageTransition>
          </main>
          <DashboardIntroTour
            role="Alumni"
            storageKey="campushub:intro:alumni-dashboard"
          />
        </div>
      </div>
    </div>
  );
}
