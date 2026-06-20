import {
  createRewardEvent,
  listRewardEvents,
} from "@/features/gamification/lib/reward-event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readRewardEventQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    status: searchParams.get("status") ?? undefined,
    trigger: searchParams.get("trigger") ?? undefined,
    includeArchived: searchParams.get("includeArchived") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const events = await listRewardEvents(readRewardEventQuery(request));

    return apiSuccess({ events });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const event = await createRewardEvent(await request.json());

    return apiSuccess({ event }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
