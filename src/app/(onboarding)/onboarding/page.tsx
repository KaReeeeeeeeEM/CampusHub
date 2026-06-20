import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { requireOnboarding } from "@/lib/auth/route-guards";

export default async function OnboardingPage() {
  await requireOnboarding();

  return <OnboardingFlow />;
}
