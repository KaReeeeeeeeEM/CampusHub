import {
  deleteSavedLocation,
  updateSavedLocation,
} from "@/features/marketplace/lib/location-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const location = await updateSavedLocation(id, await request.json());

    return apiSuccess({ location });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await deleteSavedLocation(id);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
