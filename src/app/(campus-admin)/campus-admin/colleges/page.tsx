import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { CollegesManagement } from "@/features/campus-admin/components/colleges/colleges-management";
import { mockColleges } from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminCollegesPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="University structure"
        title="Colleges"
        description="Manage the colleges that define your university structure and representative ownership boundaries."
      />
      <CollegesManagement initialColleges={mockColleges} />
    </main>
  );
}
