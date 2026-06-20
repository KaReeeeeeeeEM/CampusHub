import { listLeadershipAssignments } from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readHistoryQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    committeeId: searchParams.get("committeeId") ?? undefined,
    scopeType: searchParams.get("scopeType") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    positionId: searchParams.get("positionId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    includeHistorical: "true",
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const assignments = await listLeadershipAssignments(readHistoryQuery(request));

    return apiSuccess({ assignments });
  } catch (error) {
    return apiFailure(error);
  }
}
