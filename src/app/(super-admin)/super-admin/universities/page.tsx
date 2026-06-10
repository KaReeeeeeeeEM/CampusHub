import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { UniversityManagement } from "@/features/super-admin/components/universities/university-management";
import { getUniversities } from "@/features/super-admin/lib/super-admin-service";

export default async function SuperAdminUniversitiesPage() {
  const universities = await getUniversities();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SuperAdminPageHeader
        eyebrow="University management"
        title="Universities"
        description="Universities are the tenant foundation for CampusHub. Campus Admin invitations are attached to a specific university."
      />
      <UniversityManagement initialUniversities={universities} />
    </main>
  );
}
