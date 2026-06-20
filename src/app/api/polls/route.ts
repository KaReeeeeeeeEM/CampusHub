import { createPoll, listPolls } from "@/features/polls/lib/poll-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const polls = await listPolls({
      q: searchParams.get("q") ?? undefined,
      pollType: searchParams.get("pollType") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      mine: searchParams.get("mine") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ polls });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const poll = await createPoll(await request.json());

    return apiSuccess({ poll }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
