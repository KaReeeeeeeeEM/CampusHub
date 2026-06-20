import { listSponsorshipInterests } from "@/features/sponsorships/lib/sponsorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readInterestQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    sponsorshipId: searchParams.get("sponsorshipId") ?? undefined,
    sponsorId: searchParams.get("sponsorId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    mine: searchParams.get("mine") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const interests = await listSponsorshipInterests(readInterestQuery(request));

    return apiSuccess({ interests });
  } catch (error) {
    return apiFailure(error);
  }
}
