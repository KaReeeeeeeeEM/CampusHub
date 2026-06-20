import { contactCandidate } from "@/features/career/lib/talent-discovery-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const result = await contactCandidate(userId, await request.json());

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
