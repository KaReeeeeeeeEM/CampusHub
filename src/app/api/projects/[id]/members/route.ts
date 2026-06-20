import {
  addProjectMember,
  listProjectMembers,
} from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const members = await listProjectMembers(id);

    return apiSuccess({ members });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const member = await addProjectMember(id, await request.json());

    return apiSuccess({ member }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
