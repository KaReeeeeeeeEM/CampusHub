import { getCommitteeAnalytics } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAnalyticsQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    committeeId: searchParams.get("committeeId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const analytics = await getCommitteeAnalytics(readAnalyticsQuery(request));

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
