import { markApplicationUnderReview } from "@/features/opportunities/lib/application-service";
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
    const application = await markApplicationUnderReview(
      id,
      await readJsonOrEmpty(request),
    );

    return apiSuccess({ application });
  } catch (error) {
    return apiFailure(error);
  }
}
