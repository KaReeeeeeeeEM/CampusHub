import { NextResponse } from "next/server";

import { getInvitationUsage } from "@/features/enrollment/lib/invitation-service";

type InvitationStudentsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: InvitationStudentsRouteContext,
) {
  try {
    const { id } = await params;
    const usage = await getInvitationUsage(id);

    return NextResponse.json(usage);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load invitation usage.",
      },
      { status: 404 },
    );
  }
}
