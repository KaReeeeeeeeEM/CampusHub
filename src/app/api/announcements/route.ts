import {
  createAnnouncement,
  listAnnouncements,
} from "@/features/announcements/lib/announcement-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const announcements = await listAnnouncements({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      includeArchived: searchParams.get("includeArchived") ?? undefined,
      mine: searchParams.get("mine") ?? undefined,
    });

    return apiSuccess({ announcements });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const announcement = await createAnnouncement(await request.json());

    return apiSuccess({ announcement }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
