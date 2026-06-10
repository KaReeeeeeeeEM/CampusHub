import { apiFailure, apiSuccess } from "@/lib/api/response";
import { campusAdminInvitationInputSchema } from "@/features/super-admin/lib/schemas";
import {
  createCampusAdminInvitation,
  getCampusAdminInvitations,
} from "@/features/super-admin/lib/super-admin-service";

export async function GET() {
  try {
    const invitations = await getCampusAdminInvitations();
    return apiSuccess({ invitations });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = campusAdminInvitationInputSchema.parse(await request.json());
    const invitation = await createCampusAdminInvitation(payload);
    return apiSuccess({ invitation }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
