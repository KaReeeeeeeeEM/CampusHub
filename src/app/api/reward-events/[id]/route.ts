import { updateRewardEventStatus } from "@/features/gamification/lib/reward-event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const event = await updateRewardEventStatus(id, await request.json());

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}
