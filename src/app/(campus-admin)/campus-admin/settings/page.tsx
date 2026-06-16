import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { CampusAdminSettings } from "@/features/campus-admin/components/settings/campus-admin-settings";

export default function CampusAdminSettingsPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="University configuration"
        title="Settings"
        description="Campus-level configuration foundation for future onboarding rules, invitation policy, and module access."
      />
      <CampusAdminSettings />
    </main>
  );
}
