import { updateUserBadgeDisplay } from "@/features/gamification/lib/badge-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const userBadge = await updateUserBadgeDisplay(id, await request.json());

    return apiSuccess({ userBadge });
  } catch (error) {
    return apiFailure(error);
  }
}
