import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { AlmanacManagement } from "@/features/campus-admin/components/almanac/almanac-management";
import { listAlmanacEvents } from "@/features/almanac/lib/almanac-service";

export default async function CampusAdminAlmanacPage() {
  const events = await listAlmanacEvents({});

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Academic calendar"
        title="Almanac"
        description="Manage academic dates, deadlines, examinations, and university calendar events."
      />
      <AlmanacManagement initialEvents={events} />
    </main>
  );
}
