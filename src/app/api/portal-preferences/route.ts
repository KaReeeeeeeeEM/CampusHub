import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  getPortalPreferenceState,
  PortalAccessError,
  resetPortalPreferences,
  selectPortal,
  setDefaultPortal,
  toggleQuickAccessPortal,
} from "@/features/portal-selection/lib/portal-preferences-service";
import { portalPreferenceActionSchema } from "@/features/portal-selection/lib/schemas";

export async function GET() {
  const state = await getPortalPreferenceState();

  return NextResponse.json({ preferences: state });
}

export async function PATCH(request: Request) {
  try {
    const body = portalPreferenceActionSchema.parse(await request.json());

    if (body.action === "select") {
      const result = await selectPortal(body.portal);
      return NextResponse.json({
        preferences: result.state,
        redirectHref: result.redirectHref,
      });
    }

    if (body.action === "set-default") {
      const preferences = await setDefaultPortal(body.portal);
      return NextResponse.json({ preferences });
    }

    if (body.action === "toggle-quick") {
      const preferences = await toggleQuickAccessPortal(body.portal);
      return NextResponse.json({ preferences });
    }

    const preferences = await resetPortalPreferences();
    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof PortalAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid portal preference payload." },
        { status: 400 },
      );
    }

    throw error;
  }
}
