import { completeAchievement } from "@/features/gamification/lib/achievement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const achievement = await completeAchievement(await request.json());

    return apiSuccess({ achievement });
  } catch (error) {
    return apiFailure(error);
  }
}
