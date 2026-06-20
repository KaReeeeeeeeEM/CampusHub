import { requireCompletedOnboarding } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompletedOnboarding();

  return <DashboardThemeProvider>{children}</DashboardThemeProvider>;
}
