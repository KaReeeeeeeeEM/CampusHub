import { getProjectAnalytics } from "@/features/projects/lib/project-analytics-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const analytics = await getProjectAnalytics(id, {
      days: searchParams.get("days") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
