import { submitLeadershipReportById } from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const report = await submitLeadershipReportById(id);

    return apiSuccess({ report });
  } catch (error) {
    return apiFailure(error);
  }
}
