import { getXpBalance } from "@/features/gamification/lib/xp-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readXpBalanceQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const balance = await getXpBalance(readXpBalanceQuery(request));

    return apiSuccess({ balance });
  } catch (error) {
    return apiFailure(error);
  }
}
