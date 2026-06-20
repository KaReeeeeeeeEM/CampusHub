import {
  listCommunityUpdates,
  postCommunityUpdate,
} from "@/features/communities/lib/community-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readUpdateQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const updates = await listCommunityUpdates(id, readUpdateQuery(request));

    return apiSuccess({ updates });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const update = await postCommunityUpdate(id, await request.json());

    return apiSuccess({ update }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
