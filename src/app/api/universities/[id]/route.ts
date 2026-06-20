import {
  getUniversity,
  softDeleteUniversity,
  updateUniversity,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const university = await getUniversity(id);

    return apiSuccess({ university });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const university = await updateUniversity(id, await request.json());

    return apiSuccess({ university });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const university = await softDeleteUniversity(id);

    return apiSuccess({ university });
  } catch (error) {
    return apiFailure(error);
  }
}
