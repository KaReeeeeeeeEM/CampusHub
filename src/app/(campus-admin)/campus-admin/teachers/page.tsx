import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { TeachersManagement } from "@/features/campus-admin/components/teachers/teachers-management";
import {
  mockDepartments,
  mockTeachers,
} from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminTeachersPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
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
