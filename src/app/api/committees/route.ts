import {
  createCommittee,
  listCommittees,
} from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readCommitteeQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    scopeType: searchParams.get("scopeType") ?? undefined,
    committeeType: searchParams.get("committeeType") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const committees = await listCommittees(readCommitteeQuery(request));

    return apiSuccess({ committees });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const committee = await createCommittee(await request.json());

    return apiSuccess({ committee }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
