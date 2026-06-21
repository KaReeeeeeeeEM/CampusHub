import type { ReactNode } from "react";

import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { AlumniLayout } from "@/features/alumni-portal/components/alumni-layout";
import { requireRole } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function AlumniPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireRole(["ALUMNI"]);

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Alumni workspace"
        description="Fetching your account, role, and university details."
      >
        <AlumniLayout user={session.user}>{children}</AlumniLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
