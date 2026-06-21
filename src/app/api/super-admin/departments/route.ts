import {
  createSuperAdminDepartment,
  listSuperAdminDepartments,
} from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const departments = await listSuperAdminDepartments();
    return apiSuccess({ departments });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const department = await createSuperAdminDepartment(await request.json());
    return apiSuccess({ department }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
