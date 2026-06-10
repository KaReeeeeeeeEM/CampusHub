import { collegeInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  createCollege,
  getColleges,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const colleges = await getColleges();
    return apiSuccess({ colleges });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = collegeInputSchema.parse(await request.json());
    const college = await createCollege(payload);
    return apiSuccess({ college }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
