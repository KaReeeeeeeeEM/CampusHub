import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";

export async function POST() {
  try {
    const actor = await requireAuth();
    const result = await createSystemNotification({
      target: {
        recipientId: actor.id,
      },
      type: "PROJECT_STAR",
      title: "Firebase push test",
      message:
        "CampusHub Firebase notifications are connected for this account.",
      entityType: "pwa",
      entityId: "firebase-test",
      actionUrl: "/dashboard/pwa",
      priority: "HIGH",
      channels: {
        inApp: true,
        push: true,
        email: false,
        sms: false,
      },
      metadata: {
        engagementType: "project_star",
        source: "pwa_showcase",
      },
    });

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
