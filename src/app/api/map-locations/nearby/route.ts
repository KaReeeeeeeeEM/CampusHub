import { getNearbyLocations } from "@/features/campus-map/lib/campus-map-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locations = await getNearbyLocations({
      latitude: searchParams.get("latitude") ?? undefined,
      longitude: searchParams.get("longitude") ?? undefined,
      radiusMeters: searchParams.get("radiusMeters") ?? undefined,
      category: searchParams.get("category") ?? undefined,
    });

    return apiSuccess({ locations });
  } catch (error) {
    return apiFailure(error);
  }
}
