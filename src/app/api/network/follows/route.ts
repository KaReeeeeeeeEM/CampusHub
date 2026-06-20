import {
  followEntity,
  listFollows,
} from "@/features/networking/lib/networking-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readFollowQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const follows = await listFollows(readFollowQuery(request));

    return apiSuccess({ follows });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await followEntity(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
