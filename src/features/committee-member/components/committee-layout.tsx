import { DashboardPageTransition } from "@/components/motion/dashboard-page-transition";
import { DashboardIntroTour } from "@/components/onboarding/dashboard-intro-tour";
import { CommitteeSidebar } from "@/features/committee-member/components/committee-sidebar";
import { CommitteeTopbar } from "@/features/committee-member/components/committee-topbar";
import type { AuthUser } from "@/types/auth";

type CommitteeLayoutProps = {
  children: React.ReactNode;
  user: AuthUser;
};

export function CommitteeLayout({ children, user }: CommitteeLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <CommitteeSidebar />
        <div className="min-w-0 flex-1">
          <CommitteeTopbar user={user} />
          <DashboardPageTransition>{children}</DashboardPageTransition>
          <DashboardIntroTour
            role="Committee Member"
            storageKey="campushub:intro:committee-member-dashboard"
          />
        </div>
      </div>
    </div>
  );
}
