import {
  deleteForumPost,
  getForumPost,
  updateForumPost,
} from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const post = await getForumPost(id);

    return apiSuccess({ post });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const post = await updateForumPost(id, await request.json());

    return apiSuccess({ post });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const post = await deleteForumPost(id);

    return apiSuccess({ post });
  } catch (error) {
    return apiFailure(error);
  }
}
