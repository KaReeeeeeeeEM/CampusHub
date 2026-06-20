import { StudentLeadershipSuggestionsPageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipSuggestionsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return <StudentLeadershipSuggestionsPageView />;
}
