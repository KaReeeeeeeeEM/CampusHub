import { getAlumniProfile } from "@/features/alumni/lib/alumni-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { userId } = await params;
    const profile = await getAlumniProfile(userId);

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}
