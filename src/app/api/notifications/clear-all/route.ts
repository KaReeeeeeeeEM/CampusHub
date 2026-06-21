import { deleteAllNotifications } from "@/features/notifications/lib/notification-engine";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function DELETE() {
  try {
    const result = await deleteAllNotifications();

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
