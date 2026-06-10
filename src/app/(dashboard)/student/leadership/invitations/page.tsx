import { InvitationsManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockStudentInvitations } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipInvitationsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="Student Invitations"
        description="Generate and manage invitation links that automatically associate students with the University of Dar es Salaam and College of ICT."
      />
      <InvitationsManagement initialInvitations={mockStudentInvitations} />
    </main>
  );
}
