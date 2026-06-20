import { getCurrentSemesterEvents } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const events = await getCurrentSemesterEvents({
      date: searchParams.get("date") ?? undefined,
    });

    return apiSuccess({ events });
  } catch (error) {
    return apiFailure(error);
  }
}
