import {
  createCommitteeReport,
  listCommitteeReports,
} from "@/features/committees/lib/committee-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reports = await listCommitteeReports(id);

    return apiSuccess({ reports });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const report = await createCommitteeReport(id, await request.json());

    return apiSuccess({ report }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
