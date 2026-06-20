import { updateOrderRequestLocation } from "@/features/marketplace/lib/order-request-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const orderRequest = await updateOrderRequestLocation(
      id,
      await request.json(),
    );

    return apiSuccess({ orderRequest });
  } catch (error) {
    return apiFailure(error);
  }
}
