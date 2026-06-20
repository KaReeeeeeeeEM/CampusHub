import {
  becomeMentor,
  getMyMentorProfile,
  updateMyMentorProfile,
} from "@/features/mentorship/lib/mentorship-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const profile = await getMyMentorProfile();

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const profile = await becomeMentor(await request.json());

    return apiSuccess({ profile }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await updateMyMentorProfile(await request.json());

    return apiSuccess({ profile });
  } catch (error) {
    return apiFailure(error);
  }
}
