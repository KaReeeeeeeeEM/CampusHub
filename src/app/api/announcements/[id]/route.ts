import {
  deleteAnnouncement,
  getAnnouncement,
  updateAnnouncement,
} from "@/features/announcements/lib/announcement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const announcement = await getAnnouncement(id);

    return apiSuccess({ announcement });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const announcement = await updateAnnouncement(id, await request.json());

    return apiSuccess({ announcement });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const announcement = await deleteAnnouncement(id);

    return apiSuccess({ announcement });
  } catch (error) {
    return apiFailure(error);
  }
}
