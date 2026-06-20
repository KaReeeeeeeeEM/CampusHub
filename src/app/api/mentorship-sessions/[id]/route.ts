import { updateMentorshipSession } from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await updateMentorshipSession(id, await request.json());

    return apiSuccess({ session });
  } catch (error) {
    return apiFailure(error);
  }
}
