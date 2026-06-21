import { StudentLeadershipInvitationsPageView } from "@/features/representative/components/student-leadership-workspace";
import { getRepresentativeInvitationPageData } from "@/features/enrollment/lib/invitation-service";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipInvitationsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");
  const invitationData = await getRepresentativeInvitationPageData();

  return (
    <StudentLeadershipInvitationsPageView invitationData={invitationData} />
  );
}
