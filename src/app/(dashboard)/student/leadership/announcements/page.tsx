import { StudentLeadershipAnnouncementsPageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipAnnouncementsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipAnnouncementsPageView />;
}
