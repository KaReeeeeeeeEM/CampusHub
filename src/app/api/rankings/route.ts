import { getRanking } from "@/features/gamification/lib/ranking-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readRankingQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    leaderboard: searchParams.get("leaderboard") ?? undefined,
    scope: searchParams.get("scope") ?? undefined,
    timeFilter: searchParams.get("timeFilter") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const ranking = await getRanking(readRankingQuery(request));

    return apiSuccess({ ranking });
  } catch (error) {
    return apiFailure(error);
  }
}
