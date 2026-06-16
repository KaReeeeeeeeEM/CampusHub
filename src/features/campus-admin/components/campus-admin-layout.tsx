import { DashboardPageTransition } from "@/components/motion/dashboard-page-transition";
import { CampusAdminSidebar } from "@/features/campus-admin/components/campus-admin-sidebar";
import { CampusAdminTopbar } from "@/features/campus-admin/components/campus-admin-topbar";
import type { AuthUser } from "@/types/auth";

type CampusAdminLayoutProps = {
  user: AuthUser;
  children: React.ReactNode;
};

export function CampusAdminLayout({ user, children }: CampusAdminLayoutProps) {
  return (
    <div className="dashboard-shell min-h-screen text-foreground">
      <div className="flex min-h-screen">
        <CampusAdminSidebar />
        <div className="min-w-0 flex-1 lg:p-2">
          <div className="dashboard-app-frame">
            <CampusAdminTopbar user={user} />
            <main className="min-h-0 flex-1 overflow-y-auto">
              <DashboardPageTransition>{children}</DashboardPageTransition>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
