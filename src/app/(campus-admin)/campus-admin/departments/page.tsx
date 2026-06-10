import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { DepartmentsManagement } from "@/features/campus-admin/components/departments/departments-management";
import {
  mockColleges,
  mockDepartments,
} from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminDepartmentsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CampusAdminPageHeader
        eyebrow="Academic structure"
        title="Departments"
        description="Manage departments under colleges. Teacher invitations are assigned to departments."
      />
      <DepartmentsManagement
        colleges={mockColleges}
        initialDepartments={mockDepartments}
      />
    </main>
  );
}
