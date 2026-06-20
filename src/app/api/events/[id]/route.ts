import {
  deleteEvent,
  getEvent,
  updateEvent,
} from "@/features/events/lib/event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await getEvent(id);

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await updateEvent(id, await request.json());

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await deleteEvent(id);

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}
