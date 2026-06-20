import { AppShell } from "@/components/layout/app-shell";
import { requireCompletedOnboarding } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompletedOnboarding();

  return (
    <DashboardThemeProvider>
      <AppShell>{children}</AppShell>
    </DashboardThemeProvider>
  );
}
