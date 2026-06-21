import { setCampusAdminAlmanacActive } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const almanac = await setCampusAdminAlmanacActive(id);

    return apiSuccess({ almanac });
  } catch (error) {
    return apiFailure(error);
  }
}
