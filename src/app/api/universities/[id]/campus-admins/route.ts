import {
  assignCampusAdmin,
  listCampusAdmins,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const campusAdmins = await listCampusAdmins(id);

    return apiSuccess({ campusAdmins });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const campusAdmin = await assignCampusAdmin(id, await request.json());

    return apiSuccess({ campusAdmin }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
