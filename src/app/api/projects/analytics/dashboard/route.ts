import { getProjectAnalyticsDashboard } from "@/features/projects/lib/project-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analytics = await getProjectAnalyticsDashboard({
      universityId: searchParams.get("universityId") ?? undefined,
      days: searchParams.get("days") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
