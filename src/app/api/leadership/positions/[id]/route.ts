import {
  getLeadershipPosition,
  removeLeadershipPosition,
  updateLeadershipPosition,
} from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const position = await getLeadershipPosition(id);

    return apiSuccess({ position });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const position = await updateLeadershipPosition(id, await request.json());

    return apiSuccess({ position });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const position = await removeLeadershipPosition(id);

    return apiSuccess({ position });
  } catch (error) {
    return apiFailure(error);
  }
}
