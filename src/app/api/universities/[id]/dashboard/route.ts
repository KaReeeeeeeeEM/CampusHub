import { getUniversityDashboardStats } from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const stats = await getUniversityDashboardStats(id);

    return apiSuccess({ stats });
  } catch (error) {
    return apiFailure(error);
  }
}
