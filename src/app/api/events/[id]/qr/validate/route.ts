import { validateEventQr } from "@/features/events/lib/event-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await validateEventQr(id, await request.json());

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
