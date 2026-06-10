import { ForumsManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockForumTopics } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipForumsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="Forums Management"
        description="Moderate college discussion topics, review student engagement, and lock topics when conversations are complete."
      />
      <ForumsManagement initialTopics={mockForumTopics} />
    </main>
  );
}
