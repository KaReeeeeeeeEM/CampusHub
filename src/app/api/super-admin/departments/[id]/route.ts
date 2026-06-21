import {
  deactivateSuperAdminDepartment,
  deleteSuperAdminDepartment,
  updateSuperAdminDepartment,
} from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const department =
      payload?.action === "deactivate"
        ? await deactivateSuperAdminDepartment(id)
        : await updateSuperAdminDepartment(id, payload);

    return apiSuccess({ department });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await deleteSuperAdminDepartment(id);
    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
