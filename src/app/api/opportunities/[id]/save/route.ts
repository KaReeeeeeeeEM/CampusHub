import {
  saveOpportunity,
  unsaveOpportunity,
} from "@/features/opportunities/lib/opportunity-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await saveOpportunity({ opportunityId: id });

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const result = await unsaveOpportunity(id);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
