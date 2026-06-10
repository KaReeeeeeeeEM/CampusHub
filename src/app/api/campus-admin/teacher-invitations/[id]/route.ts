import { teacherInvitationInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  deactivateTeacherInvitation,
  resendTeacherInvitation,
  updateTeacherInvitation,
} from "@/features/campus-admin/lib/campus-admin-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body?.action === "deactivate") {
      const invitation = await deactivateTeacherInvitation(id);
      return apiSuccess({ invitation });
    }

    if (body?.action === "resend") {
      const invitation = await resendTeacherInvitation(id);
      return apiSuccess({ invitation });
    }

    const payload = teacherInvitationInputSchema.parse(body);
    const invitation = await updateTeacherInvitation(id, payload);
    return apiSuccess({ invitation });
  } catch (error) {
    return apiFailure(error);
  }
}
