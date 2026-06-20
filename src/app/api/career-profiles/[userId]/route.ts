import { getCareerProfileByUserId } from "@/features/career/lib/career-profile-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function readProfileQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    includeProjects: searchParams.get("includeProjects") ?? undefined,
    includeBadges: searchParams.get("includeBadges") ?? undefined,
    includeAchievements: searchParams.get("includeAchievements") ?? undefined,
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const result = await getCareerProfileByUserId(
      userId,
      readProfileQuery(request),
    );

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
