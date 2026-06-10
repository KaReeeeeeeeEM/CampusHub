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
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SuperAdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="mt-8">
        <EmptyState
          title="Foundation route ready"
          description="The protected route, layout, navigation, and authorization boundary are in place. Feature-specific workflows can be added here without restructuring the Super Admin workspace."
          className="max-w-none"
        />
      </div>
    </main>
  );
}
