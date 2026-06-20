import { StudentLeadershipForumsPageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipForumsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipForumsPageView />;
}
