import {
  getSponsorship,
  updateSponsorship,
} from "@/features/sponsorships/lib/sponsorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const sponsorship = await getSponsorship(id);

    return apiSuccess({ sponsorship });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const sponsorship = await updateSponsorship(id, await request.json());

    return apiSuccess({ sponsorship });
  } catch (error) {
    return apiFailure(error);
  }
}
