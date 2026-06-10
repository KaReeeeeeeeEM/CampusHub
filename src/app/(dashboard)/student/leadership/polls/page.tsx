import { PollsManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockPolls } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipPollsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="Polls Management"
        description="Create and manage structured polls that help the representative team make student-informed decisions."
      />
      <PollsManagement initialPolls={mockPolls} />
    </main>
  );
}
