import { cancelAlmanacEvent } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await cancelAlmanacEvent(id);

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}
