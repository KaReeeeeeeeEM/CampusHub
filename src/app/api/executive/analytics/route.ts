import { getExecutiveAnalytics } from "@/features/executive-analytics/lib/executive-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readExecutiveAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getExecutiveAnalytics(
      readExecutiveAnalyticsQuery(request),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
