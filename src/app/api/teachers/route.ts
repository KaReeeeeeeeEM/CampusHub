import {
  createTeacher,
  listTeachers,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teachers = await listTeachers({
      includeInactive: searchParams.get("includeInactive"),
    });

    return apiSuccess({ teachers });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await createTeacher(await request.json());

    return apiSuccess({ teacher }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
