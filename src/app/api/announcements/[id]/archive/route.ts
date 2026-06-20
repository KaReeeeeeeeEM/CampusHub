import { archiveAnnouncement } from "@/features/announcements/lib/announcement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const announcement = await archiveAnnouncement(id);

    return apiSuccess({ announcement });
  } catch (error) {
    return apiFailure(error);
  }
}
