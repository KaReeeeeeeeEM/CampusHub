import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { CampusAdminSettings } from "@/features/campus-admin/components/settings/campus-admin-settings";

export default function CampusAdminSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CampusAdminPageHeader
        eyebrow="University configuration"
        title="Settings"
        description="Campus-level configuration foundation for future onboarding rules, invitation policy, and module access."
      />
      <CampusAdminSettings />
    </main>
  );
}
