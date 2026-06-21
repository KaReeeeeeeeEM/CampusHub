import {
  deactivateSuperAdminCollege,
  deleteSuperAdminCollege,
  updateSuperAdminCollege,
} from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const college =
      payload?.action === "deactivate"
        ? await deactivateSuperAdminCollege(id)
        : await updateSuperAdminCollege(id, payload);

    return apiSuccess({ college });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await deleteSuperAdminCollege(id);
    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
