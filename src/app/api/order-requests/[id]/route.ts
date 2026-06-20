import { getOrderRequest } from "@/features/marketplace/lib/order-request-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const orderRequest = await getOrderRequest(id);

    return apiSuccess({ orderRequest });
  } catch (error) {
    return apiFailure(error);
  }
}
