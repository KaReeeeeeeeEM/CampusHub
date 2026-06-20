import { completeMentorship } from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const mentorshipRequest = await completeMentorship(id);

    return apiSuccess({ request: mentorshipRequest });
  } catch (error) {
    return apiFailure(error);
  }
}
