import { getPopularLocations } from "@/features/campus-map/lib/campus-map-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const locations = await getPopularLocations();

    return apiSuccess({ locations });
  } catch (error) {
    return apiFailure(error);
  }
}
