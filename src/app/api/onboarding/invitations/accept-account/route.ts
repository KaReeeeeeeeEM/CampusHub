import { acceptInvitedAccount } from "@/features/invitations/lib/invitation-service";
import { acceptInvitedAccountSchema } from "@/features/invitations/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const payload = acceptInvitedAccountSchema.parse(await request.json());
    const result = await acceptInvitedAccount(payload);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
