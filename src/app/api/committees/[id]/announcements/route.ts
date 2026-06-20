import { createCommitteeAnnouncement } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const announcement = await createCommitteeAnnouncement(
      id,
      await request.json(),
    );

    return apiSuccess({ announcement }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
