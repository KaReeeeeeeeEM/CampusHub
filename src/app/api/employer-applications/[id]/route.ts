import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { reviewEmployerApplication } from "@/features/employer-applications/lib/employer-application-service";
import { employerApplicationReviewSchema } from "@/features/employer-applications/lib/schemas";

type EmployerApplicationRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: EmployerApplicationRouteContext,
) {
  try {
    const { id } = await params;
    const payload = employerApplicationReviewSchema.parse(await request.json());
    const result = await reviewEmployerApplication(id, payload);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid employer application review payload." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to review employer application.",
      },
      { status: 400 },
    );
  }
}
