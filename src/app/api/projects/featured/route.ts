import { getFeaturedProjects } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projects = await getFeaturedProjects({
      category: searchParams.get("category") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ projects });
  } catch (error) {
    return apiFailure(error);
  }
}
