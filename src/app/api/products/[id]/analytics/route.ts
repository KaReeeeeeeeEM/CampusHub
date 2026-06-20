import { getProductAnalytics } from "@/features/marketplace/lib/product-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const analytics = await getProductAnalytics(id, {
      days: searchParams.get("days") ?? undefined,
    });

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
