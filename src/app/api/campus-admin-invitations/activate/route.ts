import { NextResponse } from "next/server";

import { campusAdminActivationSchema } from "@/features/super-admin/lib/schemas";
import { activateCampusAdminAccount } from "@/features/super-admin/lib/super-admin-service";

export async function POST(request: Request) {
  try {
    const payload = campusAdminActivationSchema.parse(await request.json());
    const result = await activateCampusAdminAccount(payload);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Invitation is no longer valid.",
          status: result.status,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ userId: result.userId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to activate Campus Admin account.",
      },
      { status: 400 },
    );
  }
}
