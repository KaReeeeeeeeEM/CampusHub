import { createEvent, listEvents } from "@/features/events/lib/event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const events = await listEvents({
      q: searchParams.get("q") ?? undefined,
      eventType: searchParams.get("eventType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      mine: searchParams.get("mine") ?? undefined,
      includeCancelled: searchParams.get("includeCancelled") ?? undefined,
    });

    return apiSuccess({ events });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const event = await createEvent(await request.json());

    return apiSuccess({ event }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
