import {
  getDepartment,
  softDeleteDepartment,
  updateDepartment,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const department = await getDepartment(id);

    return apiSuccess({ department });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const department = await updateDepartment(id, await request.json());

    return apiSuccess({ department });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const department = await softDeleteDepartment(id);

    return apiSuccess({ department });
  } catch (error) {
    return apiFailure(error);
  }
}
