import {
  deleteAlmanacEvent,
  getAlmanacEvent,
  updateAlmanacEvent,
} from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await getAlmanacEvent(id);

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await updateAlmanacEvent(id, await request.json());

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await deleteAlmanacEvent(id);

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}
