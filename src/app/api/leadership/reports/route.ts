import {
  listLeadershipReports,
  submitLeadershipReport,
} from "@/features/leadership/lib/leadership-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

function readReportQuery(request: Request) {
  const { searchParams } = new URL(request.url);

  return {
    universityId: searchParams.get("universityId") ?? undefined,
    collegeId: searchParams.get("collegeId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    committeeId: searchParams.get("committeeId") ?? undefined,
    scopeType: searchParams.get("scopeType") ?? undefined,
    assignmentId: searchParams.get("assignmentId") ?? undefined,
    authorId: searchParams.get("authorId") ?? undefined,
    reportType: searchParams.get("reportType") ?? undefined,
    submittedById: searchParams.get("submittedById") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const reports = await listLeadershipReports(readReportQuery(request));

    return apiSuccess({ reports });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const report = await submitLeadershipReport(await request.json());

    return apiSuccess({ report }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
