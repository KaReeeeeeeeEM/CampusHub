import { listMentors } from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readMentorQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    expertise: searchParams.get("expertise") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const mentors = await listMentors(readMentorQuery(request));

    return apiSuccess({ mentors });
  } catch (error) {
    return apiFailure(error);
  }
}
