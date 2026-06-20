import { getAlmanacCalendarRange } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const events = await getAlmanacCalendarRange({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    return apiSuccess({ events });
  } catch (error) {
    return apiFailure(error);
  }
}
