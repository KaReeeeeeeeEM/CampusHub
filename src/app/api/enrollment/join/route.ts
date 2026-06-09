import { NextResponse } from "next/server";

import { enrollStudentFromInvitation } from "@/features/enrollment/lib/invitation-service";
import { studentInvitationRegistrationSchema } from "@/features/enrollment/lib/schemas";

export async function POST(request: Request) {
  try {
    const payload = studentInvitationRegistrationSchema.parse(
      await request.json(),
    );
    const result = await enrollStudentFromInvitation(payload);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Invitation is no longer valid.",
          status: result.status,
        },
        { status: result.status === "expired" ? 410 : 400 },
      );
    }

    return NextResponse.json({ userId: result.userId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete invitation enrollment.",
      },
      { status: 400 },
    );
  }
}
