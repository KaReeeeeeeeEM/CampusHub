import { getUpcomingAlmanacEvents } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const events = await getUpcomingAlmanacEvents();

    return apiSuccess({ events });
  } catch (error) {
    return apiFailure(error);
  }
}
