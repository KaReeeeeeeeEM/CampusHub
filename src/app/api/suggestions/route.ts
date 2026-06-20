import {
  createSuggestion,
  listSuggestions,
} from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const suggestions = await listSuggestions({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      mine: searchParams.get("mine") ?? undefined,
      assignedToMe: searchParams.get("assignedToMe") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ suggestions });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const suggestion = await createSuggestion(await request.json());

    return apiSuccess({ suggestion }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
