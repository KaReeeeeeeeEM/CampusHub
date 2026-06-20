import {
  listMentorshipRequests,
  requestMentor,
} from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readRequestQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    role: searchParams.get("role") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const requests = await listMentorshipRequests(readRequestQuery(request));

    return apiSuccess({ requests });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const mentorshipRequest = await requestMentor(await request.json());

    return apiSuccess({ request: mentorshipRequest }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
