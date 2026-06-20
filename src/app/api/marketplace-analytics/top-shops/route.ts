import { getMarketplaceAnalytics } from "@/features/marketplace/lib/marketplace-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analytics = await getMarketplaceAnalytics({
      timeFilter: searchParams.get("timeFilter") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      shopId: searchParams.get("shopId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({
      scope: analytics.scope,
      shops: analytics.topShops,
    });
  } catch (error) {
    return apiFailure(error);
  }
}
