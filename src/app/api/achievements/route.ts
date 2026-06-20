import {
  createAchievement,
  listAchievements,
} from "@/features/gamification/lib/achievement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readAchievementQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    visibility: searchParams.get("visibility") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    includeGlobal: searchParams.get("includeGlobal") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const achievements = await listAchievements(readAchievementQuery(request));

    return apiSuccess({ achievements });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const achievement = await createAchievement(await request.json());

    return apiSuccess({ achievement }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
