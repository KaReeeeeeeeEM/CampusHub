import {
  assignTeacherDepartment,
  deactivateTeacher,
  getTeacher,
  updateTeacher,
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
    const teacher = await getTeacher(id);

    return apiSuccess({ teacher });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const teacher =
      body?.action === "assign_department" ||
      body?.action === "transfer_department"
        ? await assignTeacherDepartment(id, body)
        : await updateTeacher(id, body);

    return apiSuccess({ teacher });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const teacher = await deactivateTeacher(id);

    return apiSuccess({ teacher });
  } catch (error) {
    return apiFailure(error);
  }
}
