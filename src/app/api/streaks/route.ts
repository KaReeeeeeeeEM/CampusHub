import { listStreaks } from "@/features/gamification/lib/streak-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readStreakQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    streakType: searchParams.get("streakType") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const streaks = await listStreaks(readStreakQuery(request));

    return apiSuccess({ streaks });
  } catch (error) {
    return apiFailure(error);
  }
}
