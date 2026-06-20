import { getProjectLeaderboard } from "@/features/projects/lib/project-leaderboard-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leaderboard = await getProjectLeaderboard({
      type: searchParams.get("type") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      timeFilter: searchParams.get("timeFilter") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      collegeId: searchParams.get("collegeId") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({ leaderboard });
  } catch (error) {
    return apiFailure(error);
  }
}
