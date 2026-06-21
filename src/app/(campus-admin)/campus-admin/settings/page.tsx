import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { CampusAdminSettings } from "@/features/campus-admin/components/settings/campus-admin-settings";

export default function CampusAdminSettingsPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Account settings"
        title="Settings"
        description="Manage only the settings that are active today: account security and notification preferences."
      />
      <CampusAdminSettings />
    </main>
  );
}
