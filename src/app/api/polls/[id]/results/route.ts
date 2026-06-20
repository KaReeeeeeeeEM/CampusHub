import { getPollResults } from "@/features/polls/lib/poll-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const results = await getPollResults(id);

    return apiSuccess(results);
  } catch (error) {
    return apiFailure(error);
  }
}
