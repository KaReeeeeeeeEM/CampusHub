import { escalateSuggestion } from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const suggestion = await escalateSuggestion(id);

    return apiSuccess({ suggestion });
  } catch (error) {
    return apiFailure(error);
  }
}
