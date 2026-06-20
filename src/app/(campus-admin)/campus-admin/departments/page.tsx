import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { DepartmentsManagement } from "@/features/campus-admin/components/departments/departments-management";
import {
  getColleges,
  getDepartments,
} from "@/features/campus-admin/lib/campus-admin-service";

export default async function CampusAdminDepartmentsPage() {
  const [colleges, departments] = await Promise.all([
    getColleges(),
    getDepartments(),
  ]);

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Academic structure"
        title="Departments"
        description="Manage departments under colleges. Teacher invitations are assigned to departments."
      />
      <DepartmentsManagement
        colleges={colleges}
        initialDepartments={departments}
      />
    </main>
  );
}
