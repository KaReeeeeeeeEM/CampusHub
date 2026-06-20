import { respondToAlumniConnection } from "@/features/alumni/lib/alumni-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const connection = await respondToAlumniConnection(id, await request.json());

    return apiSuccess({ connection });
  } catch (error) {
    return apiFailure(error);
  }
}
