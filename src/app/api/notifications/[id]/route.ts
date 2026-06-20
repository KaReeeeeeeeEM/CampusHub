import {
  archiveNotification,
  deleteNotification,
  markNotificationRead,
} from "@/features/notifications/lib/notification-engine";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function readJsonOrEmpty(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const notification =
      action === "archive"
        ? await archiveNotification(id)
        : await markNotificationRead(id, await readJsonOrEmpty(request));

    return apiSuccess({ notification });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const notification = await deleteNotification(id);

    return apiSuccess({ notification });
  } catch (error) {
    return apiFailure(error);
  }
}
