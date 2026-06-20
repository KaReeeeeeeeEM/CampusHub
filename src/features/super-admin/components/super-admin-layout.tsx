import { DashboardPageTransition } from "@/components/motion/dashboard-page-transition";
import { DashboardIntroTour } from "@/components/onboarding/dashboard-intro-tour";
import { SuperAdminSidebar } from "@/features/super-admin/components/super-admin-sidebar";
import { SuperAdminTopbar } from "@/features/super-admin/components/super-admin-topbar";
import type { AuthUser } from "@/types/auth";

type SuperAdminLayoutProps = {
  user: AuthUser;
  children: React.ReactNode;
};

export function SuperAdminLayout({ user, children }: SuperAdminLayoutProps) {
  return (
    <div className="dashboard-shell min-h-screen text-foreground">
      <div className="flex min-h-screen">
        <SuperAdminSidebar />
        <div className="min-w-0 flex-1 lg:p-2">
          <div className="dashboard-app-frame">
            <SuperAdminTopbar user={user} />
            <main className="min-h-0 flex-1 overflow-y-auto">
              <DashboardPageTransition>{children}</DashboardPageTransition>
            </main>
            <DashboardIntroTour
              role="Super Admin"
              storageKey="campushub:intro:super-admin-dashboard"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
