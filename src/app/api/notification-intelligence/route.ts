import {
  dispatchIntelligentNotification,
  getNotificationIntelligenceSummary,
} from "@/features/notification-intelligence/lib/notification-intelligence-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readNotificationIntelligenceSummaryQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const summary = await getNotificationIntelligenceSummary(
      readNotificationIntelligenceSummaryQuery(request),
    );

    return apiSuccess({ summary });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await dispatchIntelligentNotification(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
