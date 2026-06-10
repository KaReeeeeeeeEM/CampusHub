import { CommitteeTasksView } from "@/features/committee-member/components/committee-experience";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentCommitteeTasksPage() {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return <CommitteeTasksView />;
}
