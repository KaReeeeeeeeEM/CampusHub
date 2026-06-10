import { departmentInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  deactivateDepartment,
  updateDepartment,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body?.action === "deactivate") {
      const department = await deactivateDepartment(id);
      return apiSuccess({ department });
    }

    const payload = departmentInputSchema.parse(body);
    const department = await updateDepartment(id, payload);
    return apiSuccess({ department });
  } catch (error) {
    return apiFailure(error);
  }
}
