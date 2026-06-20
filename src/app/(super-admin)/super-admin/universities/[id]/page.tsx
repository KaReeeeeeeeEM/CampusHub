import { UniversityProfilePage } from "@/features/super-admin/components/universities/university-profile-page";
import { getUniversityProfile } from "@/features/super-admin/lib/super-admin-service";

type SuperAdminUniversityProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SuperAdminUniversityProfilePage({
  params,
}: SuperAdminUniversityProfilePageProps) {
  const { id } = await params;
  const profile = await getUniversityProfile(id);

  return <UniversityProfilePage profile={profile} />;
}
