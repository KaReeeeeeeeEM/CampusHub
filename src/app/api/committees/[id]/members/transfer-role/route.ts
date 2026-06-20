import { transferCommitteeRole } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const member = await transferCommitteeRole(id, await request.json());

    return apiSuccess({ member });
  } catch (error) {
    return apiFailure(error);
  }
}
