import {
  createLeadershipPosition,
  listLeadershipPositions,
} from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readPositionQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    committeeId: searchParams.get("committeeId") ?? undefined,
    level: searchParams.get("level") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const positions = await listLeadershipPositions(readPositionQuery(request));

    return apiSuccess({ positions });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const position = await createLeadershipPosition(await request.json());

    return apiSuccess({ position }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
