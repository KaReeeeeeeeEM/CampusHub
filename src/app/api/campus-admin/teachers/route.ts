import { createTeacher } from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const teacher = await createTeacher(await request.json());

    return apiSuccess({ teacher }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
