import { removeXp } from "@/features/gamification/lib/xp-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const result = await removeXp(await request.json());

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
