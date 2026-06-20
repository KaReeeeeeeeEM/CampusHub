import { acceptMentorshipRequest } from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonOrEmpty(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const mentorshipRequest = await acceptMentorshipRequest(
      id,
      await readJsonOrEmpty(request),
    );

    return apiSuccess({ request: mentorshipRequest });
  } catch (error) {
    return apiFailure(error);
  }
}
