import { joinCommunity } from "@/features/communities/lib/community-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const member = await joinCommunity(id);

    return apiSuccess({ member });
  } catch (error) {
    return apiFailure(error);
  }
}
