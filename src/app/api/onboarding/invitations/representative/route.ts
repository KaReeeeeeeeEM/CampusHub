import { createRepresentativeInvitation } from "@/features/invitations/lib/invitation-service";
import { createRepresentativeInvitationSchema } from "@/features/invitations/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const payload = createRepresentativeInvitationSchema.parse(
      await request.json(),
    );
    const invitation = await createRepresentativeInvitation(payload);

    return apiSuccess({ invitation }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
