import { awardXp } from "@/features/gamification/lib/xp-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const result = await awardXp(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
