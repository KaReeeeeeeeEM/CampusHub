import { teacherInvitationInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  createTeacherInvitation,
  getTeacherInvitations,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const invitations = await getTeacherInvitations();
    return apiSuccess({ invitations });
  } catch (error) {
    return apiFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = teacherInvitationInputSchema.parse(await request.json());
    const invitation = await createTeacherInvitation(payload);
    return apiSuccess({ invitation }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
