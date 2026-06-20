import { z } from "zod";

import { resolveInvitation } from "@/features/invitations/lib/invitation-service";
import { apiFailure, apiSuccess } from "@/lib/api/response";

const resolveInvitationSchema = z.object({
  token: z.string().min(24),
});

export async function POST(request: Request) {
  try {
    const payload = resolveInvitationSchema.parse(await request.json());
    const result = await resolveInvitation(payload.token);

    return apiSuccess(result);
  } catch (error) {
    return apiFailure(error);
  }
}
