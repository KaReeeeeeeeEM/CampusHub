import {
  createCareerProfile,
  getMyCareerProfile,
  updateMyCareerProfile,
} from "@/features/career/lib/career-profile-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readProfileQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    includeProjects: searchParams.get("includeProjects") ?? undefined,
    includeBadges: searchParams.get("includeBadges") ?? undefined,
    includeAchievements: searchParams.get("includeAchievements") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const result = await getMyCareerProfile(readProfileQuery(request));

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const profile = await createCareerProfile(await request.json());

    return apiSuccess({ profile }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await updateMyCareerProfile(await request.json());

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}
