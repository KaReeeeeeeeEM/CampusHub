import {
  createCommitteeMeeting,
  listCommitteeMeetings,
} from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const meetings = await listCommitteeMeetings(id);

    return apiSuccess({ meetings });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const meeting = await createCommitteeMeeting(id, await request.json());

    return apiSuccess({ meeting }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
