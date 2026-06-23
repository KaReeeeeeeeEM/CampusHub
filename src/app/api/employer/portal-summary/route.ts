import { getEmployerPortalSummary } from "@/features/employer-portal/lib/employer-portal-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const summary = await getEmployerPortalSummary();

    return apiSuccess({ summary });
  } catch (error) {
    return apiFailure(error);
  }
}
