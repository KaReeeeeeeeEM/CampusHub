import { getPoll, updatePoll } from "@/features/polls/lib/poll-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const poll = await getPoll(id);

    return apiSuccess({ poll });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const poll = await updatePoll(id, await request.json());

    return apiSuccess({ poll });
  } catch (error) {
    return apiFailure(error);
  }
}
