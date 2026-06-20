import { deleteSuperAdminUser } from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await deleteSuperAdminUser(id);

    return apiSuccess({ user });
  } catch (error) {
    return apiFailure(error);
  }
}
