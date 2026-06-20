import { getGovernanceAnalytics } from "@/features/governance-analytics/lib/governance-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readGovernanceAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    committeeId: searchParams.get("committeeId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getGovernanceAnalytics(
      readGovernanceAnalyticsQuery(request),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
