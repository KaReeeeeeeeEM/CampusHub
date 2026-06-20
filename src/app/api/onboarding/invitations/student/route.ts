import { createStudentInvitation } from "@/features/invitations/lib/invitation-service";
import { createStudentInvitationSchema } from "@/features/invitations/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const payload = createStudentInvitationSchema.parse(await request.json());
    const invitation = await createStudentInvitation(payload);

    return apiSuccess({ invitation }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
