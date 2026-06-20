import { getAchievementHistory } from "@/features/gamification/lib/achievement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAchievementHistoryQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const history = await getAchievementHistory(
      readAchievementHistoryQuery(request),
    );

    return apiSuccess({ history });
  } catch (error) {
    return apiFailure(error);
  }
}
