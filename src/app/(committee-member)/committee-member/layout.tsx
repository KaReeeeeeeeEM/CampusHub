import { CommitteeLayout } from "@/features/committee-member/components/committee-layout";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";
import { DashboardThemeProvider } from "@/providers/dashboard-theme-provider";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return (
    <DashboardThemeProvider>
      <CommitteeLayout user={session.user}>{children}</CommitteeLayout>
    </DashboardThemeProvider>
  );
}
