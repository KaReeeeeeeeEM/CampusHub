import { completeCommitteeMeeting } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string; meetingId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id, meetingId } = await context.params;
    const meeting = await completeCommitteeMeeting(
      id,
      meetingId,
      await request.json(),
    );

    return apiSuccess({ meeting });
  } catch (error) {
    return apiFailure(error);
  }
}
