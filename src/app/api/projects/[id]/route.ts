import {
  deleteProject,
  getProject,
  updateProject,
} from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await getProject(id);

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await updateProject(id, await request.json());

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const project = await deleteProject(id);

    return apiSuccess({ project });
  } catch (error) {
    return apiFailure(error);
  }
}
