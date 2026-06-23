import {
  createSuperAdminCourse,
  listSuperAdminCourses,
} from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const courses = await listSuperAdminCourses();
    return apiSuccess({ courses });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const course = await createSuperAdminCourse(await request.json());
    return apiSuccess({ course }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
