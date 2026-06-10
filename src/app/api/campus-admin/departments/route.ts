import { departmentInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  createDepartment,
  getDepartments,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const departments = await getDepartments();
    return apiSuccess({ departments });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = departmentInputSchema.parse(await request.json());
    const department = await createDepartment(payload);
    return apiSuccess({ department }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
