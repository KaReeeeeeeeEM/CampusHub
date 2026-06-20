import { getEmployerAnalytics } from "@/features/opportunities/lib/employer-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    timeFilter: searchParams.get("timeFilter") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    employerId: searchParams.get("employerId") ?? undefined,
    opportunityId: searchParams.get("opportunityId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getEmployerAnalytics(readAnalyticsQuery(request));

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
