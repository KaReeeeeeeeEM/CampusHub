import type { ReactNode } from "react";

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
      <TeacherLayout user={session.user}>{children}</TeacherLayout>
    </DashboardThemeProvider>
  );
}
