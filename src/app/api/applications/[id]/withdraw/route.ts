import { withdrawApplication } from "@/features/opportunities/lib/application-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const application = await withdrawApplication(id);

    return apiSuccess({ application });
  } catch (error) {
    return apiFailure(error);
  }
}
