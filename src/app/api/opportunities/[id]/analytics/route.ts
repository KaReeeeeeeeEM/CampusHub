import { getEmployerAnalytics } from "@/features/opportunities/lib/employer-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readAnalyticsQuery(request: Request, opportunityId: string) {
  const { searchParams } = new URL(request.url);

  return {
    timeFilter: searchParams.get("timeFilter") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    employerId: searchParams.get("employerId") ?? undefined,
    opportunityId,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const analytics = await getEmployerAnalytics(
      readAnalyticsQuery(request, id),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
