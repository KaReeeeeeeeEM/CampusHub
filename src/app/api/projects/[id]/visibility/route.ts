import { updateProjectVisibility } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await updateProjectVisibility(id, await request.json());

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}
