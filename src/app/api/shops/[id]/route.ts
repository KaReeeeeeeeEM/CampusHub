import { getShop, updateShop } from "@/features/marketplace/lib/shop-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const shop = await getShop(id);

    return apiSuccess({ shop });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const shop = await updateShop(id, await request.json());

    return apiSuccess({ shop });
  } catch (error) {
    return apiFailure(error);
  }
}
