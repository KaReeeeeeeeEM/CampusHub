import { NextResponse } from "next/server";

import { createInvitationSchema } from "@/features/enrollment/lib/schemas";
import {
  createStudentInvitation,
  getRepresentativeInvitations,
} from "@/features/enrollment/lib/invitation-service";

export async function GET() {
  try {
    const invitations = await getRepresentativeInvitations();
    return NextResponse.json({ invitations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load invitations.",
      },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = createInvitationSchema.parse(await request.json());
    const invitation = await createStudentInvitation(payload);

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create invitation.",
      },
      { status: 400 },
    );
  }
}
