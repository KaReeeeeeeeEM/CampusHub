import { getStreakSummary } from "@/features/gamification/lib/streak-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readSummaryQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    streakType: searchParams.get("streakType") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const summary = await getStreakSummary(readSummaryQuery(request));

    return apiSuccess({ summary });
  } catch (error) {
    return apiFailure(error);
  }
}
