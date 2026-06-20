import {
  becomeAlumni,
  getMyAlumniProfile,
  updateMyAlumniProfile,
} from "@/features/alumni/lib/alumni-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const profile = await getMyAlumniProfile();

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const profile = await becomeAlumni(await request.json());

    return apiSuccess({ profile }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await updateMyAlumniProfile(await request.json());

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}
