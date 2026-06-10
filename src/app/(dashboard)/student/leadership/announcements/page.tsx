import { AnnouncementsManagement } from "@/features/representative/components/representative-management";
import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { mockAnnouncements } from "@/features/representative/lib/mock-data";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";

export default async function StudentLeadershipAnnouncementsPage() {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <RepresentativePageHeader
        eyebrow="Leadership"
        title="College Announcements"
        description="Create, publish, review, and archive college announcements for students and committee channels."
      />
      <AnnouncementsManagement initialAnnouncements={mockAnnouncements} />
    </main>
  );
}
