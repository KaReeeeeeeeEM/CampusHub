import {
  createMentorshipSession,
  listMentorshipSessions,
} from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const sessions = await listMentorshipSessions(id);

    return apiSuccess({ sessions });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await createMentorshipSession(id, await request.json());

    return apiSuccess({ session }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
