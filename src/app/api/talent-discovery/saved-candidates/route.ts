import {
  listSavedCandidates,
  saveCandidate,
} from "@/features/career/lib/talent-discovery-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await listSavedCandidates({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      opportunityId: searchParams.get("opportunityId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = await saveCandidate(await request.json());

    return apiSuccess(result, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
