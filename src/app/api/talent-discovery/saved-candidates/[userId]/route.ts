import { unsaveCandidate } from "@/features/career/lib/talent-discovery-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const result = await unsaveCandidate(userId);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
