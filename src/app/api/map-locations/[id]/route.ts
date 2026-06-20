import {
  deleteMapLocation,
  getMapLocation,
  updateMapLocation,
} from "@/features/campus-map/lib/campus-map-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const location = await getMapLocation(id);

    return apiSuccess({ location });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const location = await updateMapLocation(id, await request.json());

    return apiSuccess({ location });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const location = await deleteMapLocation(id);

    return apiSuccess({ location });
  } catch (error) {
    return apiFailure(error);
  }
}
