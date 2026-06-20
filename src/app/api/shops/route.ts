import { createShop, listShops } from "@/features/marketplace/lib/shop-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shops = await listShops({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      verified: searchParams.get("verified") ?? undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ shops });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const shop = await createShop(await request.json());

    return apiSuccess({ shop }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
