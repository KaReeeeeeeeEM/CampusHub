import { voteForumEntity } from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const result = await voteForumEntity("POST", id, payload.vote);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
