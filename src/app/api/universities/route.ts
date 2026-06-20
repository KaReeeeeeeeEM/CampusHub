import {
  createUniversity,
  listUniversities,
} from "@/features/university-management/lib/university-management-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const universities = await listUniversities({
      includeInactive: searchParams.get("includeInactive"),
    });

    return apiSuccess({ universities });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const university = await createUniversity(await request.json());

    return apiSuccess({ university }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
