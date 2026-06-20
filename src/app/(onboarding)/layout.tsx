import { AppShell } from "@/components/layout/app-shell";
import { requireOnboarding } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboarding();

  return (
    <DashboardThemeProvider>
      <AppShell>{children}</AppShell>
    </DashboardThemeProvider>
  );
}
