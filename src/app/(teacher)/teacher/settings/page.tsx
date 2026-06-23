import { TeacherSettings } from "@/features/teacher-portal/components/teacher-settings";

export default function TeacherSettingsPage() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          Account settings
        </p>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Manage only the settings that are active today: account security and
            notification preferences.
          </p>
        </div>
      </header>
      <TeacherSettings />
    </main>
  );
}
