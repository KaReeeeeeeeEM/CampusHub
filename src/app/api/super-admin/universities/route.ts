import { apiFailure, apiSuccess } from "@/lib/api/response";
import { universityInputSchema } from "@/features/super-admin/lib/schemas";
import {
  createUniversity,
  getUniversities,
} from "@/features/super-admin/lib/super-admin-service";

export async function GET() {
  try {
    const universities = await getUniversities();
    return apiSuccess({ universities });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = universityInputSchema.parse(await request.json());
    const university = await createUniversity(payload);
    return apiSuccess({ university }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
