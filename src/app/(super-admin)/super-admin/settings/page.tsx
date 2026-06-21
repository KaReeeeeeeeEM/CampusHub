import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { SuperAdminSettingsManagement } from "@/features/super-admin/components/settings/super-admin-settings-management";

export default function SuperAdminSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Account settings"
        title="Settings"
        description="Manage only the account settings that are active today: sign-in security and notification preferences."
      />
      <SuperAdminSettingsManagement />
    </main>
  );
}
