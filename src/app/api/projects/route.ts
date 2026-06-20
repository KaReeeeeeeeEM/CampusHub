import {
  createProject,
  listProjects,
} from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projects = await listProjects({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      projectStatus: searchParams.get("projectStatus") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      featured: searchParams.get("featured") ?? undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ projects });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const project = await createProject(await request.json());

    return apiSuccess({ project }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
