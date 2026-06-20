import {
  deleteProduct,
  getProduct,
  updateProduct,
} from "@/features/marketplace/lib/product-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await getProduct(id);

    return apiSuccess({ product });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await updateProduct(id, await request.json());

    return apiSuccess({ product });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await deleteProduct(id);

    return apiSuccess({ product });
  } catch (error) {
    return apiFailure(error);
  }
}
