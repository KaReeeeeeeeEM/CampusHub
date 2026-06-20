import {
  getCommunity,
  updateCommunity,
} from "@/features/communities/lib/community-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const community = await getCommunity(id);

    return apiSuccess({ community });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const community = await updateCommunity(id, await request.json());

    return apiSuccess({ community });
  } catch (error) {
    return apiFailure(error);
  }
}
