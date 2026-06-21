import { notFound } from "next/navigation";

import { SuperAdminCommitteeDetail } from "@/features/super-admin/components/committees/super-admin-committee-detail";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";
import { getSuperAdminCommitteeCommunityDetail } from "@/features/super-admin/lib/super-admin-service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ communityId: string }>;
};

export default async function SuperAdminCommitteeCommunityPage({
  params,
}: Props) {
  const { communityId } = await params;
  const detail = await getSuperAdminCommitteeCommunityDetail(communityId);

  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow={detail.community.universityName}
        title={detail.community.name}
        description="Review committees available in this community context and remove committee members when required."
      />
      <SuperAdminCommitteeDetail detail={detail} />
    </main>
  );
}
