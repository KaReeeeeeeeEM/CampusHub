import { DashboardPageTransition } from "@/components/motion/dashboard-page-transition";
import { DashboardIntroTour } from "@/components/onboarding/dashboard-intro-tour";
import { RepresentativeSidebar } from "@/features/representative/components/representative-sidebar";
import { RepresentativeTopbar } from "@/features/representative/components/representative-topbar";
import type { AuthUser } from "@/types/auth";

type RepresentativeLayoutProps = {
  user: AuthUser;
  children: React.ReactNode;
};

export function RepresentativeLayout({
  user,
  children,
}: RepresentativeLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <RepresentativeSidebar />
        <div className="min-w-0 flex-1">
          <RepresentativeTopbar user={user} />
          <DashboardPageTransition>{children}</DashboardPageTransition>
          <DashboardIntroTour
            role="Representative"
            storageKey="campushub:intro:representative-dashboard"
          />
        </div>
      </div>
    </div>
  );
}
