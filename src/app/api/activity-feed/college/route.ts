import { getCollegeFeed } from "@/features/activity-feed/lib/activity-feed-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activities = await getCollegeFeed({
      universityId: searchParams.get("universityId") ?? undefined,
      collegeId: searchParams.get("collegeId") ?? undefined,
      activityType: searchParams.get("activityType") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      entityType: searchParams.get("entityType") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ activities });
  } catch (error) {
    return apiFailure(error);
  }
}
