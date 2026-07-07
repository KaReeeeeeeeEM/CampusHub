import { CampusAdminInvitationsManagement } from "@/features/super-admin/components/campus-admins/campus-admin-invitations-management";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import {
  getCampusAdminAccounts,
  getCampusAdminInvitations,
  getUniversities,
} from "@/features/super-admin/lib/super-admin-service";

export default async function SuperAdminCampusAdminsPage() {
  const [universities, accounts, invitations] = await Promise.all([
    getUniversities(),
    getCampusAdminAccounts(),
    getCampusAdminInvitations(),
  ]);

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Campus admin management"
        title="Campus Administrators"
        description="Review active Campus Admin accounts and manage university-specific activation invitations."
      />
      <CampusAdminInvitationsManagement
        universities={universities}
        initialAccounts={accounts}
        initialInvitations={invitations}
      />
    </main>
  );
}
