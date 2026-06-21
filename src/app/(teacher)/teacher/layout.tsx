import type { ReactNode } from "react";

import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { TeacherLayout } from "@/features/teacher-portal/components/teacher-layout";
import { requireRole } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function TeacherPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireRole(["TEACHER"]);

  return (
    <DashboardThemeProvider>
      <AuthReadyGate
        title="Loading Teacher workspace"
        description="Fetching your account, role, and university details."
      >
        <TeacherLayout user={session.user}>{children}</TeacherLayout>
      </AuthReadyGate>
    </DashboardThemeProvider>
  );
}
