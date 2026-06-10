import { CommitteeEventsView } from "@/features/committee-member/components/committee-experience";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentCommitteeEventsPage() {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return <CommitteeEventsView />;
}
