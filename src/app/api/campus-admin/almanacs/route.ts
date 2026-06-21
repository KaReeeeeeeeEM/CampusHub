import {
  createCampusAdminAlmanac,
  listCampusAdminAlmanacs,
} from "@/features/almanac/lib/almanac-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const almanacs = await listCampusAdminAlmanacs();

    return apiSuccess({ almanacs });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const almanac = await createCampusAdminAlmanac(await request.json());

    return apiSuccess({ almanac }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
