import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { AlmanacManagement } from "@/features/campus-admin/components/almanac/almanac-management";
import { mockAlmanacEvents } from "@/features/campus-admin/lib/mock-data";

export default function CampusAdminAlmanacPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CampusAdminPageHeader
        eyebrow="Academic calendar"
        title="Almanac"
        description="Manage academic dates, deadlines, examinations, and university calendar events."
      />
      <AlmanacManagement initialEvents={mockAlmanacEvents} />
    </main>
  );
}
