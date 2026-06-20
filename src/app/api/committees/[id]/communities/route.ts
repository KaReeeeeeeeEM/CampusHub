import { createCommitteeCommunity } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const community = await createCommitteeCommunity(id, await request.json());

    return apiSuccess({ community }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
