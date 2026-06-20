import { getPublicProject } from "@/features/projects/lib/public-project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await getPublicProject(id);

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}
