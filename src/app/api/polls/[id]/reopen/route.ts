import { reopenPoll } from "@/features/polls/lib/poll-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const poll = await reopenPoll(id);

    return apiSuccess({ poll });
  } catch (error) {
    return apiFailure(error);
  }
}
