import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { DepartmentsManagement } from "@/features/campus-admin/components/departments/departments-management";
import {
  mockColleges,
  mockDepartments,
} from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminDepartmentsPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
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
