import { getUnseenRewardEventCount } from "@/features/gamification/lib/reward-event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const result = await getUnseenRewardEventCount();

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
