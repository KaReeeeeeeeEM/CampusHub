import { CommitteeManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockCommitteeMembers } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipCommitteePage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="Committee Management"
        description="Manage executive and category leads for academic affairs, sports, media, technology, entertainment, and student welfare."
      />
      <CommitteeManagement initialMembers={mockCommitteeMembers} />
    </main>
  );
}
