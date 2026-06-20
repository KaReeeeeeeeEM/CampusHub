import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { SuperAdminUsersManagement } from "@/features/super-admin/components/users/super-admin-users-management";
import { listSuperAdminUsers } from "@/features/super-admin/lib/super-admin-service";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  const users = await listSuperAdminUsers();

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Identity"
        title="Users"
        description="Global user management across students, teachers, administrators, alumni, employers, and student leadership positions."
      />
      <SuperAdminUsersManagement initialUsers={users} />
    </main>
  );
}
