import { createCampusAdminAlmanacEntry } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await createCampusAdminAlmanacEntry(id, await request.json());

    return apiSuccess({ event }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
