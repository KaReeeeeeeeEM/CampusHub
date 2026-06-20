import { removeProjectMember } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id, userId } = await params;
    const result = await removeProjectMember(id, userId);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
