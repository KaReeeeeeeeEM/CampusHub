import { dispatchDueNotificationReminders } from "@/features/notifications/lib/reminder-dispatch-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await dispatchDueNotificationReminders({
      universityId:
        typeof body?.universityId === "string" ? body.universityId : null,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
