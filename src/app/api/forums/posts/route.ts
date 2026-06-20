import {
  createForumPost,
  listForumPosts,
} from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const posts = await listForumPosts({
      q: searchParams.get("q") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      mine: searchParams.get("mine") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ posts });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const post = await createForumPost(await request.json());

    return apiSuccess({ post }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
