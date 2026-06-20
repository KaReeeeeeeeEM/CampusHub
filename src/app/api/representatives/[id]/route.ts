import {
  removeRepresentative,
  transferRepresentative,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await transferRepresentative(id, await request.json());

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await removeRepresentative(id);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
