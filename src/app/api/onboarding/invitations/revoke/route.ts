import { revokeInvitation } from "@/features/invitations/lib/invitation-service";
import { revokeInvitationSchema } from "@/features/invitations/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function PATCH(request: Request) {
  try {
    const payload = revokeInvitationSchema.parse(await request.json());
    const invitation = await revokeInvitation(payload.invitationId);

    return apiSuccess({ invitation });
  } catch (error) {
    return apiFailure(error);
  }
}
