import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "Default badge seeding is disabled during stabilization. Create badge records through approved administrative workflows.",
    },
    { status: 410 },
  );
}
