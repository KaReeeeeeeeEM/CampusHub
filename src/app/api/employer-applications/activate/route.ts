import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { activateEmployerAccount } from "@/features/employer-applications/lib/employer-application-service";
import { employerActivationSchema } from "@/features/employer-applications/lib/schemas";

export async function POST(request: Request) {
  try {
    const payload = employerActivationSchema.parse(await request.json());
    const result = await activateEmployerAccount(payload);

    if (!result.ok) {
      return NextResponse.json(
        { status: result.status, error: "Invalid employer activation link." },
        { status: 400 },
      );
    }

    return NextResponse.json({ userId: result.userId });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid employer activation payload." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to activate employer account.",
      },
      { status: 400 },
    );
  }
}
