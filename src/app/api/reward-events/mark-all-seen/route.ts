import { markAllRewardEventsSeen } from "@/features/gamification/lib/reward-event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function PATCH() {
  try {
    const result = await markAllRewardEventsSeen();

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
