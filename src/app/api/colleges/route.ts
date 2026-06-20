import {
  createCollege,
  listColleges,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const colleges = await listColleges({
      includeInactive: searchParams.get("includeInactive"),
    });

    return apiSuccess({ colleges });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const college = await createCollege(await request.json());

    return apiSuccess({ college }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
