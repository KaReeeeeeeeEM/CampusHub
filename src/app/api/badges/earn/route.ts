import { earnBadge } from "@/features/gamification/lib/badge-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const result = await earnBadge(await request.json());

    return apiSuccess(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
