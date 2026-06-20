import { updateAchievementProgress } from "@/features/gamification/lib/achievement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const achievement = await updateAchievementProgress(await request.json());

    return apiSuccess({ achievement });
  } catch (error) {
    return apiFailure(error);
  }
}
