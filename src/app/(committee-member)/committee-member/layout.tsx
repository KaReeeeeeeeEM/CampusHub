import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { CommitteeLayout } from "@/features/committee-member/components/committee-layout";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Committee workspace"
        description="Fetching your account, role, and committee details."
      >
        <CommitteeLayout user={session.user}>{children}</CommitteeLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
