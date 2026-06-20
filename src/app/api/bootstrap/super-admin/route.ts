import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  BootstrapDisabledError,
  BootstrapValidationError,
  createInitialSuperAdmin,
  isSuperAdminBootstrapEnabled,
} from "@/features/bootstrap/lib/bootstrap-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await isSuperAdminBootstrapEnabled();

  return NextResponse.json({ enabled });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await createInitialSuperAdmin(body);

    return NextResponse.json(
      {
        user,
        redirectTo: "/login",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Invalid bootstrap payload.",
          issues: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (error instanceof BootstrapValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof BootstrapDisabledError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { message: "Unable to create the initial Super Admin." },
      { status: 500 },
    );
  }
}
