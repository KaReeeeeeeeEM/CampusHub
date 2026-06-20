import { getProjectAppreciation } from "@/features/projects/lib/project-appreciation-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const appreciation = await getProjectAppreciation(id, {
      days: searchParams.get("days") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    return apiSuccess({ appreciation });
  } catch (error) {
    return apiFailure(error);
  }
}
