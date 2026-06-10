import { CommitteeAnnouncementsView } from "@/features/committee-member/components/committee-experience";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentCommitteeAnnouncementsPage() {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return <CommitteeAnnouncementsView />;
}
