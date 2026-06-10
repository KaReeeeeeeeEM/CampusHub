import { representativeInvitationInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  createRepresentativeInvitation,
  getRepresentativeInvitations,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const invitations = await getRepresentativeInvitations();
    return apiSuccess({ invitations });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = representativeInvitationInputSchema.parse(
      await request.json(),
    );
    const invitation = await createRepresentativeInvitation(payload);
    return apiSuccess({ invitation }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
