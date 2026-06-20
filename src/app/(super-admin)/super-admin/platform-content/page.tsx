import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { PlatformContentManagement } from "@/features/super-admin/components/platform-content/platform-content-management";
import { listPlatformContent } from "@/features/super-admin/lib/platform-content-service";

export const dynamic = "force-dynamic";

export default async function SuperAdminPlatformContentPage() {
  const { items, universities } = await listPlatformContent({ type: "all" });

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Platform Oversight"
        title="Platform Content"
        description="View and manage announcements, events, almanac records, map locations, polls, suggestions, forums, communities, and committees across every university."
      />
      <PlatformContentManagement
        initialItems={items}
        universities={universities}
      />
    </main>
  );
}
