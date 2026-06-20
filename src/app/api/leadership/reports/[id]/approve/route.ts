import { approveLeadershipReport } from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const report = await approveLeadershipReport(id, await request.json());

    return apiSuccess({ report });
  } catch (error) {
    return apiFailure(error);
  }
}
