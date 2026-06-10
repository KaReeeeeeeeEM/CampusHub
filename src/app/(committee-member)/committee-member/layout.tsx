import { CommitteeLayout } from "@/features/committee-member/components/committee-layout";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return <CommitteeLayout>{children}</CommitteeLayout>;
}
