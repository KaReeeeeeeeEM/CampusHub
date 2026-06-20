import { exportLeadershipReport } from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const reportExport = await exportLeadershipReport(id);

    return apiSuccess({ export: reportExport });
  } catch (error) {
    return apiFailure(error);
  }
}
