import {
  getOpportunity,
  updateOpportunity,
} from "@/features/opportunities/lib/opportunity-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const opportunity = await getOpportunity(id);

    return apiSuccess({ opportunity });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const opportunity = await updateOpportunity(id, await request.json());

    return apiSuccess({ opportunity });
  } catch (error) {
    return apiFailure(error);
  }
}
