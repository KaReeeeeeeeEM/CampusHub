import { listSavedProjects } from "@/features/projects/lib/project-appreciation-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projects = await listSavedProjects({
      type: "FAVORITE",
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ projects });
  } catch (error) {
    return apiFailure(error);
  }
}
