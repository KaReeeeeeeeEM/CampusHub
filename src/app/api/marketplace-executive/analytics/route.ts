import { getMarketplaceExecutiveAnalytics } from "@/features/marketplace-executive-analytics/lib/marketplace-executive-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readMarketplaceExecutiveAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getMarketplaceExecutiveAnalytics(
      readMarketplaceExecutiveAnalyticsQuery(request),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
