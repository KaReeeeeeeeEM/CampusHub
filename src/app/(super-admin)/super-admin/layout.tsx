import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { SuperAdminLayout } from "@/features/super-admin/components/super-admin-layout";
import { requireRole } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function SuperAdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["SUPER_ADMIN"]);

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Super Admin workspace"
        description="Fetching your account, role, and platform permissions."
      >
        <SuperAdminLayout user={session.user}>{children}</SuperAdminLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
