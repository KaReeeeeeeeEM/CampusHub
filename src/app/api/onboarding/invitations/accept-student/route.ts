import { acceptStudentInvitation } from "@/features/invitations/lib/invitation-service";
import { acceptStudentInvitationSchema } from "@/features/invitations/lib/schemas";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const payload = acceptStudentInvitationSchema.parse(await request.json());
    const result = await acceptStudentInvitation(payload);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
