import { EventsManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockEvents } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipEventsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="College Events"
        description="Manage hackathons, workshops, sports activities, conferences, clubs, and social events for the college."
      />
      <EventsManagement initialEvents={mockEvents} />
    </main>
  );
}
