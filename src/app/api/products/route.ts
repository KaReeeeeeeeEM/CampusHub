import {
  createProduct,
  listProducts,
} from "@/features/marketplace/lib/product-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const products = await listProducts({
      q: searchParams.get("q") ?? undefined,
      shopId: searchParams.get("shopId") ?? undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      productType: searchParams.get("productType") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      featured: searchParams.get("featured") ?? undefined,
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

export async function POST(request: Request) {
  try {
    const product = await createProduct(await request.json());

    return apiSuccess({ product }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
