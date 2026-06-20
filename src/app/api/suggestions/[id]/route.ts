import { getSuggestion } from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const suggestion = await getSuggestion(id);

    return apiSuccess({ suggestion });
  } catch (error) {
    return apiFailure(error);
  }
}
