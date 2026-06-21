import {
  createSuperAdminCollege,
  listSuperAdminColleges,
} from "@/features/super-admin/lib/super-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const colleges = await listSuperAdminColleges();
    return apiSuccess({ colleges });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const college = await createSuperAdminCollege(await request.json());
    return apiSuccess({ college }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
