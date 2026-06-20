import { reportForumEntity } from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const report = await reportForumEntity(id, await request.json());

    return apiSuccess({ report }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
