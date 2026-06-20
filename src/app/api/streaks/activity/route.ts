import { recordStreakActivity } from "@/features/gamification/lib/streak-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const result = await recordStreakActivity(await request.json());

    return apiSuccess(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
