import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { CampusAdminLayout } from "@/features/campus-admin/components/campus-admin-layout";
import { requireRole } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function CampusAdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["CAMPUS_ADMIN"]);

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Campus Admin workspace"
        description="Fetching your account, university, and administrative scope."
      >
        <CampusAdminLayout user={session.user}>{children}</CampusAdminLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
