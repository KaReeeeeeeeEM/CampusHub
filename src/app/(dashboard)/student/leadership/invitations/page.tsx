import { StudentLeadershipInvitationsPageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipInvitationsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipInvitationsPageView />;
}
