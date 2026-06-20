import {
  addProjectLink,
  listProjectLinks,
} from "@/features/projects/lib/project-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const links = await listProjectLinks(id);

    return apiSuccess({ links });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const link = await addProjectLink(id, await request.json());

    return apiSuccess({ link }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
