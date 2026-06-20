import { listApplications } from "@/features/opportunities/lib/application-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readApplicationQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    opportunityId: searchParams.get("opportunityId") ?? undefined,
    studentId: searchParams.get("studentId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const applications = await listApplications(readApplicationQuery(request));

    return apiSuccess({ applications });
  } catch (error) {
    return apiFailure(error);
  }
}
