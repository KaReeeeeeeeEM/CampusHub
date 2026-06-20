import {
  createDepartment,
  listDepartments,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const departments = await listDepartments({
      includeInactive: searchParams.get("includeInactive"),
    });

    return apiSuccess({ departments });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const department = await createDepartment(await request.json());

    return apiSuccess({ department }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
