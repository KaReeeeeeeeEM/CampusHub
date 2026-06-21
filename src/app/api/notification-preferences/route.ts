import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/features/pwa/lib/pwa-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const preferences = await getNotificationPreferences();

    return apiSuccess({ preferences });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const preferences = await updateNotificationPreferences(
      await request.json(),
    );

    return apiSuccess({ preferences });
  } catch (error) {
    return apiFailure(error);
  }
}
