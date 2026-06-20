import {
  createSponsorship,
  listSponsorships,
} from "@/features/sponsorships/lib/sponsorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readSponsorshipQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    sponsorshipType: searchParams.get("sponsorshipType") ?? undefined,
    targetEntityType: searchParams.get("targetEntityType") ?? undefined,
    targetEntityId: searchParams.get("targetEntityId") ?? undefined,
    sponsorId: searchParams.get("sponsorId") ?? undefined,
    requestedById: searchParams.get("requestedById") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    mine: searchParams.get("mine") ?? undefined,
    includePrivate: searchParams.get("includePrivate") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const sponsorships = await listSponsorships(readSponsorshipQuery(request));

    return apiSuccess({ sponsorships });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const sponsorship = await createSponsorship(await request.json());

    return apiSuccess({ sponsorship }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
