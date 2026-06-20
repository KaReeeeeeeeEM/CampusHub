import { getXpLeaderboard } from "@/features/gamification/lib/xp-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readXpLeaderboardQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    timeframe: searchParams.get("timeframe") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const leaderboard = await getXpLeaderboard(readXpLeaderboardQuery(request));

    return apiSuccess({ leaderboard });
  } catch (error) {
    return apiFailure(error);
  }
}
