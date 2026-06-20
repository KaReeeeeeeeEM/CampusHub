import { toggleForumBookmark } from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await toggleForumBookmark(id);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
