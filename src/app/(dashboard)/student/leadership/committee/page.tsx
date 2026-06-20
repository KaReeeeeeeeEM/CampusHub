import { StudentLeadershipCommitteePageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipCommitteePage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipCommitteePageView />;
}
