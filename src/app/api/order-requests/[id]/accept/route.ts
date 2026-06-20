import { acceptOrderRequest } from "@/features/marketplace/lib/order-request-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonOrEmpty(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const orderRequest = await acceptOrderRequest(
      id,
      await readJsonOrEmpty(request),
    );

    return apiSuccess({ orderRequest });
  } catch (error) {
    return apiFailure(error);
  }
}
