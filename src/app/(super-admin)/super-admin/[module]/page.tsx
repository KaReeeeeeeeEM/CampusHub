import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { SuperAdminCollegesManagement } from "@/features/super-admin/components/colleges/super-admin-colleges-management";
import { PlatformContentManagement } from "@/features/super-admin/components/platform-content/platform-content-management";
import { getSuperAdminModuleBySlug } from "@/features/super-admin/components/super-admin-navigation";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { listPlatformContent } from "@/features/super-admin/lib/platform-content-service";
import { listSuperAdminColleges } from "@/features/super-admin/lib/super-admin-service";

export const dynamic = "force-dynamic";

type SuperAdminModulePageProps = {
  params: Promise<{ module: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminModulePage({
  params,
  searchParams,
}: SuperAdminModulePageProps) {
  const { module: moduleSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminModule = getSuperAdminModuleBySlug(moduleSlug);

  if (!adminModule) {
    notFound();
  }

  if (moduleSlug === "colleges") {
    const colleges = await listSuperAdminColleges();
    const universityIdParam = resolvedSearchParams.universityId;
    const initialUniversityId = Array.isArray(universityIdParam)
      ? universityIdParam[0]
      : universityIdParam;

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <SuperAdminCollegesManagement
          colleges={colleges}
          initialUniversityId={initialUniversityId ?? null}
        />
      </main>
    );
  }

  if (adminModule.contentType) {
    const { items, universities } = await listPlatformContent({
      type: adminModule.contentType,
    });

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <PlatformContentManagement
          initialItems={items}
          universities={universities}
          initialType={adminModule.contentType}
          lockType
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow={adminModule.eyebrow}
        title={adminModule.title}
        description={adminModule.description}
      />
      <div className="mt-8">
        <EmptyState
          title="No records available"
          description="This Super Admin module is protected and accessible from the sidebar. Live database records and module-specific actions will appear here once backend records exist."
          className="max-w-none"
        />
      </div>
    </main>
  );
}
