import {
  createCommunity,
  listCommunities,
} from "@/features/communities/lib/community-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readCommunityQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    visibility: searchParams.get("visibility") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    mine: searchParams.get("mine") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const communities = await listCommunities(readCommunityQuery(request));

    return apiSuccess({ communities });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const community = await createCommunity(await request.json());

    return apiSuccess({ community }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
