import { StudentLeadershipPollsPageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipPollsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipPollsPageView />;
}
