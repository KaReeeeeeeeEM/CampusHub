import { getXpHistory } from "@/features/gamification/lib/xp-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readXpHistoryQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    userId: searchParams.get("userId") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    sourceType: searchParams.get("sourceType") ?? undefined,
    sourceId: searchParams.get("sourceId") ?? undefined,
    transactionType: searchParams.get("transactionType") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const history = await getXpHistory(readXpHistoryQuery(request));

    return apiSuccess({ history });
  } catch (error) {
    return apiFailure(error);
  }
}
