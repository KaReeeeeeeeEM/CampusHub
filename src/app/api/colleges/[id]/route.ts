import {
  getCollege,
  softDeleteCollege,
  updateCollege,
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
    const college = await getCollege(id);

    return apiSuccess({ college });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const college = await updateCollege(id, await request.json());

    return apiSuccess({ college });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const college = await softDeleteCollege(id);

    return apiSuccess({ college });
  } catch (error) {
    return apiFailure(error);
  }
}
