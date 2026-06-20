import { approveSponsorshipInterest } from "@/features/sponsorships/lib/sponsorship-service";
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
    const interest = await approveSponsorshipInterest(
      id,
      await readJsonOrEmpty(request),
    );

    return apiSuccess({ interest });
  } catch (error) {
    return apiFailure(error);
  }
}
