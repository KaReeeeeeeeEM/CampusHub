import { archiveProduct } from "@/features/marketplace/lib/product-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await archiveProduct(id);

    return apiSuccess({ product });
  } catch (error) {
    return apiFailure(error);
  }
}
