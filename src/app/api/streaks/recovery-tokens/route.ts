import { grantRecoveryTokens } from "@/features/gamification/lib/streak-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const streak = await grantRecoveryTokens(await request.json());

    return apiSuccess({ streak });
  } catch (error) {
    return apiFailure(error);
  }
}
