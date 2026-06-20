import { searchMarketplaceLocations } from "@/features/marketplace/lib/location-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locations = await searchMarketplaceLocations({
      q: searchParams.get("q") ?? undefined,
      includeSaved: searchParams.get("includeSaved") ?? undefined,
      includeMapLocations: searchParams.get("includeMapLocations") ?? undefined,
      marketplaceDeliveryOnly:
        searchParams.get("marketplaceDeliveryOnly") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({ locations });
  } catch (error) {
    return apiFailure(error);
  }
}
