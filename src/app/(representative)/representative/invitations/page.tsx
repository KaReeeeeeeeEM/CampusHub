import { getRepresentativeInvitationPageData } from "@/features/enrollment/lib/invitation-service";
import { StudentLeadershipInvitationsPageView } from "@/features/representative/components/student-leadership-workspace";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function RepresentativeInvitationsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");
  const invitationData = await getRepresentativeInvitationPageData();

  return (
    <StudentLeadershipInvitationsPageView invitationData={invitationData} />
  );
}
