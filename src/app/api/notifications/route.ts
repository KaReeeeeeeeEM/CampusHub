import {
  createNotification,
  listNotifications,
} from "@/features/notifications/lib/notification-engine";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notifications = await listNotifications({
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      entityType: searchParams.get("entityType") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      includeArchived: searchParams.get("includeArchived") ?? undefined,
    });

    return apiSuccess({ notifications });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await createNotification(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
