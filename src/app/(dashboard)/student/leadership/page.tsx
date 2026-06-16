import { StudentLeadershipWorkspace } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipWorkspace />;
}
