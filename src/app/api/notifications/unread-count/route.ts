import { getUnreadNotificationCount } from "@/features/notifications/lib/notification-engine";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const unread = await getUnreadNotificationCount();

    return apiSuccess(unread);
  } catch (error) {
    return apiFailure(error);
  }
}
