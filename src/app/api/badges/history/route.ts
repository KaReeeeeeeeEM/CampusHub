import { getBadgeHistory } from "@/features/gamification/lib/badge-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readUserBadgeQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    rarity: searchParams.get("rarity") ?? undefined,
    displayOnly: searchParams.get("displayOnly") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const history = await getBadgeHistory(readUserBadgeQuery(request));

    return apiSuccess({ history });
  } catch (error) {
    return apiFailure(error);
  }
}
