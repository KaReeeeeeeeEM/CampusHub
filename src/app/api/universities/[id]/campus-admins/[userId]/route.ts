import { removeCampusAdmin } from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
    userId: string;
  }>;
};

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id, userId } = await params;
    const campusAdmin = await removeCampusAdmin(id, userId);

    return apiSuccess({ campusAdmin });
  } catch (error) {
    return apiFailure(error);
  }
}
