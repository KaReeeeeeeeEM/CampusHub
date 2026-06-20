import { archiveProject } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await archiveProject(id);

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}
