import { getInnovationAnalytics } from "@/features/innovation-analytics/lib/innovation-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readInnovationAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getInnovationAnalytics(
      readInnovationAnalyticsQuery(request),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
