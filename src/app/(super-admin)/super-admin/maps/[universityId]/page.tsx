import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { SuperAdminCampusMapDetail } from "@/features/super-admin/components/maps/super-admin-campus-map-detail";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { getSuperAdminCampusMap } from "@/features/super-admin/lib/super-admin-map-service";

export const dynamic = "force-dynamic";

type SuperAdminCampusMapDetailPageProps = {
  params: Promise<{ universityId: string }>;
};

export default async function SuperAdminCampusMapDetailPage({
  params,
}: SuperAdminCampusMapDetailPageProps) {
  const { universityId } = await params;
  const campusMap = await getSuperAdminCampusMap(universityId);

  if (!campusMap) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <div className="mb-5">
        <Button asChild variant="ghost">
          <Link href="/super-admin/maps">
            <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to maps
          </Link>
        </Button>
      </div>
      <SuperAdminPageHeader
        eyebrow="Campus map"
        title={campusMap.universityName}
        description={`View saved campus map points for ${campusMap.universityName}.`}
      />
      <SuperAdminCampusMapDetail campusMap={campusMap} />
    </main>
  );
}
