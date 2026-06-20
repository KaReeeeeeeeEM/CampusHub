import { trackProjectView } from "@/features/projects/lib/project-analytics-service";
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
    const result = await trackProjectView(id, await readJsonOrEmpty(request));

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
