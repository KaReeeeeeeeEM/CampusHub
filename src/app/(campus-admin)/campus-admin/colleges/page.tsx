import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { CollegesManagement } from "@/features/campus-admin/components/colleges/colleges-management";
import { mockColleges } from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminCollegesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CampusAdminPageHeader
        eyebrow="University structure"
        title="Colleges"
        description="Manage the colleges that define your university structure and representative ownership boundaries."
      />
      <CollegesManagement initialColleges={mockColleges} />
    </main>
  );
}
