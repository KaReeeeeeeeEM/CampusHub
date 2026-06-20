import { getSuggestionAnalytics } from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const analytics = await getSuggestionAnalytics();

    return apiSuccess({ analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
