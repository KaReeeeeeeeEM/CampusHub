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
      <SuperAdminLayout user={session.user}>{children}</SuperAdminLayout>
    </DashboardThemeProvider>
  );
}
