import { engageAlmanacReminder } from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string; reminderId: string }> };

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id, reminderId } = await params;
    const event = await engageAlmanacReminder(id, reminderId);

    return apiSuccess({ event });
  } catch (error) {
    return apiFailure(error);
  }
}
