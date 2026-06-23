import { notFound } from "next/navigation";

import { SuperAdminAlmanacWorkspace } from "@/features/super-admin/components/almanac/super-admin-almanac-workspace";
import { SuperAdminCollegesManagement } from "@/features/super-admin/components/colleges/super-admin-colleges-management";
import { SuperAdminCommitteeCommunities } from "@/features/super-admin/components/committees/super-admin-committee-communities";
import { SuperAdminCoursesManagement } from "@/features/super-admin/components/courses/super-admin-courses-management";
import { SuperAdminDepartmentsManagement } from "@/features/super-admin/components/departments/super-admin-departments-management";
import { SuperAdminDomainWorkspace } from "@/features/super-admin/components/domain/super-admin-domain-workspace";
import { SuperAdminCampusMapsDirectory } from "@/features/super-admin/components/maps/super-admin-campus-maps-directory";
import { PlatformContentManagement } from "@/features/super-admin/components/platform-content/platform-content-management";
import {
  isSuperAdminConcreteModuleSlug,
  SuperAdminConcreteModulePage,
} from "@/features/super-admin/components/super-admin-module-pages";
import { getSuperAdminModuleBySlug } from "@/features/super-admin/components/super-admin-navigation";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { getSuperAdminDomainWorkspace } from "@/features/super-admin/lib/super-admin-domain-service";
import { listSuperAdminAlmanacs } from "@/features/super-admin/lib/super-admin-almanac-service";
import { listSuperAdminCampusMaps } from "@/features/super-admin/lib/super-admin-map-service";
import { listPlatformContent } from "@/features/super-admin/lib/platform-content-service";
import {
  getUniversities,
  listSuperAdminCommitteeCommunities,
  listSuperAdminColleges,
  listSuperAdminCourses,
  listSuperAdminDepartments,
} from "@/features/super-admin/lib/super-admin-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
    const [colleges, universities] = await Promise.all([
      listSuperAdminColleges(),
      getUniversities(),
    ]);
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
          universities={universities}
          initialUniversityId={initialUniversityId ?? null}
        />
      </main>
    );
  }

  if (moduleSlug === "departments") {
    const [departments, colleges, universities] = await Promise.all([
      listSuperAdminDepartments(),
      listSuperAdminColleges(),
      getUniversities(),
    ]);

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <SuperAdminDepartmentsManagement
          departments={departments}
          colleges={colleges}
          universities={universities}
        />
      </main>
    );
  }

  if (moduleSlug === "courses") {
    const [courses, departments, universities] = await Promise.all([
      listSuperAdminCourses(),
      listSuperAdminDepartments(),
      getUniversities(),
    ]);

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <SuperAdminCoursesManagement
          courses={courses}
          departments={departments}
          universities={universities}
        />
      </main>
    );
  }

  if (moduleSlug === "committees") {
    const communities = await listSuperAdminCommitteeCommunities();

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title="Committee Communities"
          description="Browse committee communities by university, then open a community to review committees and manage members."
        />
        <SuperAdminCommitteeCommunities communities={communities} />
      </main>
    );
  }

  if (moduleSlug === "maps") {
    const maps = await listSuperAdminCampusMaps();

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <SuperAdminCampusMapsDirectory maps={maps} />
      </main>
    );
  }

  if (moduleSlug === "almanac") {
    const { almanacs, universities } = await listSuperAdminAlmanacs();

    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description="Create university almanacs first, then open each almanac calendar to add dated events and deadlines."
        />
        <SuperAdminAlmanacWorkspace
          initialAlmanacs={almanacs}
          universities={universities}
        />
      </main>
    );
  }

  if (isSuperAdminConcreteModuleSlug(moduleSlug)) {
    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <SuperAdminConcreteModulePage moduleSlug={moduleSlug} />
      </main>
    );
  }

  const domainWorkspace = await getSuperAdminDomainWorkspace(moduleSlug);

  if (domainWorkspace) {
    return (
      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <SuperAdminPageHeader
          eyebrow={adminModule.eyebrow}
          title={adminModule.title}
          description={adminModule.description}
        />
        <SuperAdminDomainWorkspace workspace={domainWorkspace} />
      </main>
    );
  }

  if (adminModule.contentType) {
    const { items, universities, colleges, departments, mapLocations } = await listPlatformContent({
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
          colleges={colleges}
          departments={departments}
          mapLocations={mapLocations}
          initialType={adminModule.contentType}
          lockType
        />
      </main>
    );
  }

  notFound();
}
