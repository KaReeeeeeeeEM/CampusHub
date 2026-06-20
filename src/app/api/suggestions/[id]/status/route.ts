import { updateSuggestionStatus } from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const suggestion = await updateSuggestionStatus(id, await request.json());

    return apiSuccess({ suggestion });
  } catch (error) {
    return apiFailure(error);
  }
}
