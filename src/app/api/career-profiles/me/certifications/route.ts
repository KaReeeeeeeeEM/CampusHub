import { addCareerCertification } from "@/features/career/lib/career-profile-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const profile = await addCareerCertification(await request.json());

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}
