import { createCommitteePoll } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const poll = await createCommitteePoll(id, await request.json());

    return apiSuccess({ poll }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
