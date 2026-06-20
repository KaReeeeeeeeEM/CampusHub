import { listOpportunities } from "@/features/opportunities/lib/opportunity-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunities = await listOpportunities({
      q: searchParams.get("q") ?? undefined,
      universityId: searchParams.get("universityId") ?? undefined,
      industry: searchParams.get("industry") ?? undefined,
      workType: searchParams.get("workType") ?? undefined,
      locationType: searchParams.get("locationType") ?? undefined,
      skills: searchParams.get("skills") ?? undefined,
      deadlineFrom: searchParams.get("deadlineFrom") ?? undefined,
      deadlineTo: searchParams.get("deadlineTo") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      savedOnly: true,
    });

    return apiSuccess({ opportunities });
  } catch (error) {
    return apiFailure(error);
  }
}
