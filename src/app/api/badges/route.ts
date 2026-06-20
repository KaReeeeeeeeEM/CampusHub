import {
  createBadge,
  listBadges,
} from "@/features/gamification/lib/badge-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readBadgeQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    rarity: searchParams.get("rarity") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    includeGlobal: searchParams.get("includeGlobal") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const badges = await listBadges(readBadgeQuery(request));

    return apiSuccess({ badges });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const badge = await createBadge(await request.json());

    return apiSuccess({ badge }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
