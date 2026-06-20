import { createCommitteeSuggestion } from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const suggestion = await createCommitteeSuggestion(id, await request.json());

    return apiSuccess({ suggestion }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
