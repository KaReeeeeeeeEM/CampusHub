import { EmptyState } from "@/components/shared/empty-state";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";

type SuperAdminPlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SuperAdminPlaceholderPage({
  eyebrow,
  title,
  description,
}: SuperAdminPlaceholderPageProps) {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="mt-8">
        <EmptyState
          title="No records available"
          description="This protected Super Admin module is ready for live backend records. No mock data is rendered on this page."
          className="max-w-none"
        />
      </div>
    </main>
  );
}
