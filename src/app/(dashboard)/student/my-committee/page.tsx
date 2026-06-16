import { StudentCommitteeWorkspace } from "@/features/committee-member/components/committee-experience";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentMyCommitteePage() {
  await requireStudentLeadershipPosition("COMMITTEE_MEMBER");

  return <StudentCommitteeWorkspace />;
}
