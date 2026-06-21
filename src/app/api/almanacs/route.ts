import { listVisibleAlmanacs } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const almanacs = await listVisibleAlmanacs();

    return apiSuccess({ almanacs });
  } catch (error) {
    return apiFailure(error);
  }
}
