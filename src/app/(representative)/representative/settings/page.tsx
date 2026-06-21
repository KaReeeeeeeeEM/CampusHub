import { RepresentativePageHeader } from "@/features/representative/components/representative-page-header";
import { RepresentativeSettings } from "@/features/representative/components/representative-settings";

export default function RepresentativeSettingsPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <RepresentativePageHeader
        eyebrow="Account settings"
        title="Settings"
        description="Manage only the settings that are active today: account security and notification preferences."
      />
      <RepresentativeSettings />
    </main>
  );
}
