import { getForumAnalytics } from "@/features/forums/lib/forum-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const analytics = await getForumAnalytics();

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
