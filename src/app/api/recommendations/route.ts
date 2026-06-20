import { getRecommendations } from "@/features/recommendations/lib/recommendation-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readRecommendationQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    type: searchParams.get("type") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    targetUserId: searchParams.get("targetUserId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const recommendations = await getRecommendations(
      readRecommendationQuery(request),
    );

    return apiSuccess({ recommendations });
  } catch (error) {
    return apiFailure(error);
  }
}
