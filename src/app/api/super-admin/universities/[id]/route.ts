import { apiFailure, apiSuccess } from "@/lib/api/response";
import { universityInputSchema } from "@/features/super-admin/lib/schemas";
import {
  deactivateUniversity,
  updateUniversity,
} from "@/features/super-admin/lib/super-admin-service";

type UniversityRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: UniversityRouteContext,
) {
  try {
    const { id } = await params;
    const payload = await request.json();

    if (payload?.action === "deactivate") {
      const university = await deactivateUniversity(id);
      return apiSuccess({ university });
    }

    const university = await updateUniversity(
      id,
      universityInputSchema.parse(payload),
    );

    return apiSuccess({ university });
  } catch (error) {
    return apiFailure(error);
  }
}
