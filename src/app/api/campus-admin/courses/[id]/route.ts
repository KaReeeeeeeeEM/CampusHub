import { courseInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  deactivateCourse,
  updateCourse,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const course =
      body?.action === "deactivate"
        ? await deactivateCourse(id)
        : await updateCourse(id, courseInputSchema.parse(body));

    return apiSuccess({ course });
  } catch (error) {
    return apiFailure(error);
  }
}
