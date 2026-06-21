import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { RepresentativeLayout } from "@/features/representative/components/representative-layout";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Representative workspace"
        description="Fetching your account, role, and representative scope."
      >
        <RepresentativeLayout user={session.user}>{children}</RepresentativeLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
