import { withdrawSponsorshipInterest } from "@/features/sponsorships/lib/sponsorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const interest = await withdrawSponsorshipInterest(id);

    return apiSuccess({ interest });
  } catch (error) {
    return apiFailure(error);
  }
}
