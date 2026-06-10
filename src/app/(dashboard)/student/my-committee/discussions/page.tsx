import { CommitteeForumView } from "@/features/committee-member/components/committee-experience";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentCommitteeDiscussionsPage() {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return <CommitteeForumView />;
}
