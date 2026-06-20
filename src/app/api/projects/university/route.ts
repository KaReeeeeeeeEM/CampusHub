import { getUniversityProjects } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projects = await getUniversityProjects(
      searchParams.get("universityId") ?? undefined,
    );

    return apiSuccess({ projects });
  } catch (error) {
    return apiFailure(error);
  }
}
