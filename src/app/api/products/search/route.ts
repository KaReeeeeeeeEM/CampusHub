import { searchProducts } from "@/features/marketplace/lib/product-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const products = await searchProducts({
      q: searchParams.get("q") ?? undefined,
      shopId: searchParams.get("shopId") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      productType: searchParams.get("productType") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      minPrice: searchParams.get("minPrice") ?? undefined,
      maxPrice: searchParams.get("maxPrice") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ products });
  } catch (error) {
    return apiFailure(error);
  }
}
