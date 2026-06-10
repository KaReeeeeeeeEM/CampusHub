import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { TeachersManagement } from "@/features/campus-admin/components/teachers/teachers-management";
import {
  mockDepartments,
  mockTeachers,
} from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminTeachersPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CampusAdminPageHeader
        eyebrow="Academic staff"
        title="Teachers"
        description="Invite and manage teachers. Teacher accounts are activated through invitation links."
      />
      <TeachersManagement
        departments={mockDepartments}
        initialInvitations={mockTeachers}
      />
    </main>
  );
}
