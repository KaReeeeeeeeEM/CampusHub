import { representativeInvitationInputSchema } from "@/features/campus-admin/lib/schemas";
import {
  deactivateRepresentativeInvitation,
  resendRepresentativeInvitation,
  updateRepresentativeInvitation,
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
      const invitation = await deactivateRepresentativeInvitation(id);
      return apiSuccess({ invitation });
    }

    if (body?.action === "resend") {
      const invitation = await resendRepresentativeInvitation(id);
      return apiSuccess({ invitation });
    }

    const payload = representativeInvitationInputSchema.parse(body);
    const invitation = await updateRepresentativeInvitation(id, payload);
    return apiSuccess({ invitation });
  } catch (error) {
    return apiFailure(error);
  }
}
