import type { ReactNode } from "react";

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
      <AlumniLayout user={session.user}>{children}</AlumniLayout>
    </DashboardThemeProvider>
  );
}
