import { getUserProjects } from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const projects = await getUserProjects(userId);

    return apiSuccess({ projects });
  } catch (error) {
    return apiFailure(error);
  }
}
