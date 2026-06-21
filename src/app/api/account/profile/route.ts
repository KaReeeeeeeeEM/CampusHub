import {
  getAccountProfileAnalytics,
  getAccountProfile,
  updateAccountProfile,
} from "@/features/account/lib/account-profile-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const [profile, analytics] = await Promise.all([
      getAccountProfile(),
      getAccountProfileAnalytics(),
    ]);

    return apiSuccess({ profile, analytics });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await updateAccountProfile(await request.json());
    const analytics = await getAccountProfileAnalytics();

    return apiSuccess({ profile, analytics });
  } catch (error) {
    return apiFailure(error);
  }
}
