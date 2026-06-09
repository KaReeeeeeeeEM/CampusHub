import { NextResponse } from "next/server";

import { updateInvitationSchema } from "@/features/enrollment/lib/schemas";
import {
  disableInvitation,
  regenerateInvitation,
} from "@/features/enrollment/lib/invitation-service";

type InvitationRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: InvitationRouteContext,
) {
  try {
    const { id } = await params;
    const payload = updateInvitationSchema.parse(await request.json());
    const invitation =
      payload.action === "disable"
        ? await disableInvitation(id)
        : await regenerateInvitation(id, payload);

    return NextResponse.json({ invitation });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update invitation.",
      },
      { status: 400 },
    );
  }
}
