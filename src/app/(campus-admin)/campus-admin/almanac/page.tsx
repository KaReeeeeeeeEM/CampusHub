import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { AlmanacManagement } from "@/features/campus-admin/components/almanac/almanac-management";
import { mockAlmanacEvents } from "@/features/campus-admin/lib/mock-data";

export default function CampusAdminAlmanacPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Academic calendar"
        title="Almanac"
        description="Manage academic dates, deadlines, examinations, and university calendar events."
      />
      <AlmanacManagement initialEvents={mockAlmanacEvents} />
    </main>
  );
}
