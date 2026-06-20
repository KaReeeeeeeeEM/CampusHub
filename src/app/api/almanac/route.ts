import {
  createAlmanacEvent,
  listAlmanacEvents,
} from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const events = await listAlmanacEvents({
      q: searchParams.get("q") ?? undefined,
      eventType: searchParams.get("eventType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      includeArchived: searchParams.get("includeArchived") ?? undefined,
    });

    return apiSuccess({ events });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const event = await createAlmanacEvent(await request.json());

    return apiSuccess({ event }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
