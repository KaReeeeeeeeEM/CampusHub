import { SuggestionsManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockSuggestions } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipSuggestionsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="Suggestions Management"
        description="Review student suggestions, inspect anonymous feedback, and update the review status for committee follow-up."
      />
      <SuggestionsManagement initialSuggestions={mockSuggestions} />
    </main>
  );
}
