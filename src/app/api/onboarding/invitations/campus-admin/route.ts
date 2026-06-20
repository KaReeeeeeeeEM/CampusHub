import { createCampusAdminInvitation } from "@/features/invitations/lib/invitation-service";
import { createCampusAdminInvitationSchema } from "@/features/invitations/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const payload = createCampusAdminInvitationSchema.parse(
      await request.json(),
    );
    const invitation = await createCampusAdminInvitation(payload);

    return apiSuccess({ invitation }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
