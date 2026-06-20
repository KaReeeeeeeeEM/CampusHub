import { exportPollResults } from "@/features/polls/lib/poll-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const exported = await exportPollResults(id);

    return apiSuccess({ export: exported });
  } catch (error) {
    return apiFailure(error);
  }
}
