import { markAllNotificationsRead } from "@/features/notifications/lib/notification-engine";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function PATCH() {
  try {
    const result = await markAllNotificationsRead();

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
