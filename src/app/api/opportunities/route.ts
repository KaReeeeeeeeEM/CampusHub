import {
  createOpportunity,
  listOpportunities,
} from "@/features/opportunities/lib/opportunity-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readOpportunityQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    q: searchParams.get("q") ?? undefined,
    universityId: searchParams.get("universityId") ?? undefined,
    employerId: searchParams.get("employerId") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    workType: searchParams.get("workType") ?? undefined,
    locationType: searchParams.get("locationType") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    skills: searchParams.get("skills") ?? undefined,
    savedOnly: searchParams.get("savedOnly") ?? undefined,
    includeArchived: searchParams.get("includeArchived") ?? undefined,
    deadlineFrom: searchParams.get("deadlineFrom") ?? undefined,
    deadlineTo: searchParams.get("deadlineTo") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const opportunities = await listOpportunities(
      readOpportunityQuery(request),
    );

    return apiSuccess({ opportunities });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const opportunity = await createOpportunity(await request.json());

    return apiSuccess({ opportunity }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
