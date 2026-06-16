import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { SuperAdminUsersManagement } from "@/features/super-admin/components/users/super-admin-users-management";

export default function SuperAdminUsersPage() {
  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Identity"
        title="Users"
        description="Global user management across students, teachers, administrators, alumni, employers, and student leadership positions."
      />
      <SuperAdminUsersManagement />
    </main>
  );
}
