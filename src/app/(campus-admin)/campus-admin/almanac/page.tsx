import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { AlmanacManagement } from "@/features/campus-admin/components/almanac/almanac-management";
import { listCampusAdminAlmanacs } from "@/features/almanac/lib/almanac-service";

export default async function CampusAdminAlmanacPage() {
  const almanacs = await listCampusAdminAlmanacs();

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Academic calendar"
        title="Almanac"
        description="Create academic calendar shells, then add dated almanac events and deadlines from each calendar."
      />
      <AlmanacManagement initialAlmanacs={almanacs} />
    </main>
  );
}
