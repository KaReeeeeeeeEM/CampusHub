import { archiveOpportunity } from "@/features/opportunities/lib/opportunity-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const opportunity = await archiveOpportunity(id);

    return apiSuccess({ opportunity });
  } catch (error) {
    return apiFailure(error);
  }
}
