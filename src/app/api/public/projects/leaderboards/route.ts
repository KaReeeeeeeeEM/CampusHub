import { getPublicProjectLeaderboard } from "@/features/projects/lib/public-project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leaderboard = await getPublicProjectLeaderboard({
      type: searchParams.get("type") ?? undefined,
      timeFilter: searchParams.get("timeFilter") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({ leaderboard });
  } catch (error) {
    return apiFailure(error);
  }
}
