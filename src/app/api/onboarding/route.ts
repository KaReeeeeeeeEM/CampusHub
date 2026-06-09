import { NextResponse } from "next/server";

import {
  completeOnboarding,
  getOnboardingProgress,
  saveOnboardingProgress,
} from "@/features/onboarding/lib/onboarding-service";
import {
  completeOnboardingSchema,
  saveOnboardingSchema,
} from "@/features/onboarding/lib/schemas";

export async function GET() {
  try {
    const onboarding = await getOnboardingProgress();
    return NextResponse.json({ onboarding });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load onboarding progress.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = saveOnboardingSchema.parse(await request.json());
    const onboarding = await saveOnboardingProgress(payload);

    return NextResponse.json({ onboarding });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save onboarding progress.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = completeOnboardingSchema.parse(await request.json());
    const onboarding = await completeOnboarding(payload);

    return NextResponse.json({ onboarding });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete onboarding.",
      },
      { status: 400 },
    );
  }
}
