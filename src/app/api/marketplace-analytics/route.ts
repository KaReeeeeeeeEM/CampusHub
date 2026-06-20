import { getMarketplaceAnalytics } from "@/features/marketplace/lib/marketplace-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    timeFilter: searchParams.get("timeFilter") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    ownerId: searchParams.get("ownerId") ?? undefined,
    shopId: searchParams.get("shopId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getMarketplaceAnalytics(
      readAnalyticsQuery(request),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
