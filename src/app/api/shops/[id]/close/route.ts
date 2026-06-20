import { closeShop } from "@/features/marketplace/lib/shop-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const shop = await closeShop(id);

    return apiSuccess({ shop });
  } catch (error) {
    return apiFailure(error);
  }
}
