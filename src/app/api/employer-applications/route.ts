import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  getEmployerApplications,
  submitEmployerApplication,
} from "@/features/employer-applications/lib/employer-application-service";
import { employerApplicationSchema } from "@/features/employer-applications/lib/schemas";

export async function GET() {
  try {
    const applications = await getEmployerApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load employer applications.",
      },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = employerApplicationSchema.parse(await request.json());
    const application = await submitEmployerApplication(payload);

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid employer application payload." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit employer application.",
      },
      { status: 400 },
    );
  }
}
