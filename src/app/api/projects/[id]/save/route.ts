import {
  removeSavedProject,
  saveProject,
} from "@/features/projects/lib/project-appreciation-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await saveProject(id);

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await removeSavedProject(id);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
