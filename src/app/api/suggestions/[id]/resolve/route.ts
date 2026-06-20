import { resolveSuggestion } from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const suggestion = await resolveSuggestion(id, await request.json());

    return apiSuccess({ suggestion });
  } catch (error) {
    return apiFailure(error);
  }
}
