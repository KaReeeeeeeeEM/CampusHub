import { getStudentEngagementAnalytics } from "@/features/student-engagement/lib/student-engagement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readStudentEngagementQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getStudentEngagementAnalytics(
      readStudentEngagementQuery(request),
    );

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
