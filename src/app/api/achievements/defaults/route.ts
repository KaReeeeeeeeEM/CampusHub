import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message:
        "Default achievement seeding is disabled during stabilization. Create achievement records through approved administrative workflows.",
    },
    { status: 410 },
  );
}
