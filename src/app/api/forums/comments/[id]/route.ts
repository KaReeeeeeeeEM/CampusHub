import {
  deleteForumComment,
  updateForumComment,
} from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const comment = await updateForumComment(id, await request.json());

    return apiSuccess({ comment });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const comment = await deleteForumComment(id);

    return apiSuccess({ comment });
  } catch (error) {
    return apiFailure(error);
  }
}
