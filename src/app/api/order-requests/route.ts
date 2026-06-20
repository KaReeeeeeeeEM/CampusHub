import {
  createOrderRequest,
  listOrderRequests,
} from "@/features/marketplace/lib/order-request-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requests = await listOrderRequests({
      productId: searchParams.get("productId") ?? undefined,
      shopId: searchParams.get("shopId") ?? undefined,
      buyerId: searchParams.get("buyerId") ?? undefined,
      sellerId: searchParams.get("sellerId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ requests });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const orderRequest = await createOrderRequest(await request.json());

    return apiSuccess({ orderRequest }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
