import { moderateForumPost } from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonOrEmpty(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const post = await moderateForumPost(
      id,
      searchParams.get("pinned") === "false" ? "UNPIN" : "PIN",
      await readJsonOrEmpty(request),
    );

    return apiSuccess({ post });
  } catch (error) {
    return apiFailure(error);
  }
}
