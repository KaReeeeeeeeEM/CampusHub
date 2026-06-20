import {
  commentOnSuggestion,
  listSuggestionComments,
} from "@/features/suggestions/lib/suggestion-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const comments = await listSuggestionComments(id);

    return apiSuccess({ comments });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const comment = await commentOnSuggestion(id, await request.json());

    return apiSuccess({ comment }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
