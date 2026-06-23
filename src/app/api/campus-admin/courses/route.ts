import { courseInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  createCourse,
  getCourses,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const courses = await getCourses();
    return apiSuccess({ courses });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = courseInputSchema.parse(await request.json());
    const course = await createCourse(payload);
    return apiSuccess({ course }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
