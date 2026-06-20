import { getAlumniAnalytics } from "@/features/alumni/lib/alumni-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    graduationYear: searchParams.get("graduationYear") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getAlumniAnalytics(readAnalyticsQuery(request));

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
