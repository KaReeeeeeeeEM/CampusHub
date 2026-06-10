import { collegeInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  deactivateCollege,
  updateCollege,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body?.action === "deactivate") {
      const college = await deactivateCollege(id);
      return apiSuccess({ college });
    }

    const payload = collegeInputSchema.parse(body);
    const college = await updateCollege(id, payload);
    return apiSuccess({ college });
  } catch (error) {
    return apiFailure(error);
  }
}
