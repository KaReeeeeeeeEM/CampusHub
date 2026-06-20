import { getUserAchievements } from "@/features/gamification/lib/achievement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readUserAchievementQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const achievements = await getUserAchievements(
      readUserAchievementQuery(request),
    );

    return apiSuccess({ achievements });
  } catch (error) {
    return apiFailure(error);
  }
}
