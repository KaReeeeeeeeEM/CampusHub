import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { EmployerLayout } from "@/features/employer-portal/components/employer-layout";
import { requireRole } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function EmployerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["EMPLOYER"]);

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Employer workspace"
        description="Fetching your account, role, and organization details."
      >
        <EmployerLayout user={session.user}>{children}</EmployerLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
