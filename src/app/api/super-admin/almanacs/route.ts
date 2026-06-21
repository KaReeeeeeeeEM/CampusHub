import {
  createSuperAdminAlmanac,
  listSuperAdminAlmanacs,
} from "@/features/super-admin/lib/super-admin-almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    return apiSuccess(await listSuperAdminAlmanacs());
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const almanac = await createSuperAdminAlmanac(await request.json());

    return apiSuccess({ almanac }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
