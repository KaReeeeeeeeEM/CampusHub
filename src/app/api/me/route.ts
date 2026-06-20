import {
  getAuthenticatedUserProfile,
  updateAuthenticatedUserProfile,
} from "@/features/auth/lib/user-profile-service";
import { userProfileUpdateSchema } from "@/features/auth/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const user = await getAuthenticatedUserProfile();
    return apiSuccess({ user });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = userProfileUpdateSchema.parse(await request.json());
    const user = await updateAuthenticatedUserProfile(payload);

    return apiSuccess({ user });
  } catch (error) {
    return apiFailure(error);
  }
}
