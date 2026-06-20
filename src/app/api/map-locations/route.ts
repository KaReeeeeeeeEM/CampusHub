import {
  createMapLocation,
  listMapLocations,
} from "@/features/campus-map/lib/campus-map-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locations = await listMapLocations({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      includeInactive: searchParams.get("includeInactive") ?? undefined,
    });

    return apiSuccess({ locations });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const location = await createMapLocation(await request.json());

    return apiSuccess({ location }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
