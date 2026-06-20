import { leaveEvent } from "@/features/events/lib/event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await leaveEvent(id);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
