import { transferLeadership } from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readJsonOrEmpty(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const assignment = await transferLeadership(
      id,
      await readJsonOrEmpty(request),
    );

    return apiSuccess({ assignment }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
