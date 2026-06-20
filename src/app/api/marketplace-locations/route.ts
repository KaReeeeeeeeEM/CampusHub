import {
  createSavedLocation,
  listSavedLocations,
} from "@/features/marketplace/lib/location-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locations = await listSavedLocations({
      locationType: searchParams.get("locationType") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ locations });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const location = await createSavedLocation(await request.json());

    return apiSuccess({ location }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
