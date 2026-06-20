import { searchPublicProjects } from "@/features/projects/lib/public-project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projects = await searchPublicProjects({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ projects });
  } catch (error) {
    return apiFailure(error);
  }
}
