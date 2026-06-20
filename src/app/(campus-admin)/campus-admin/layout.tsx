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
      <CampusAdminLayout user={session.user}>{children}</CampusAdminLayout>
    </DashboardThemeProvider>
  );
}
