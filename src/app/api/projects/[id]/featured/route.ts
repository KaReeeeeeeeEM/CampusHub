import { setProjectFeatured } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const project = await setProjectFeatured(id, Boolean(payload.featured));

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}
