import {
  applyToOpportunity,
  listApplications,
} from "@/features/opportunities/lib/application-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const applications = await listApplications({
      opportunityId: id,
      status: searchParams.get("status") ?? undefined,
      role: searchParams.get("role") ?? "EMPLOYER",
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess({ applications });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const application = await applyToOpportunity(id, await request.json());

    return apiSuccess({ application }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
