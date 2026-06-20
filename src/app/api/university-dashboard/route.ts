import { getUniversityDashboardStats } from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const stats = await getUniversityDashboardStats();

    return apiSuccess({ stats });
  } catch (error) {
    return apiFailure(error);
  }
}
