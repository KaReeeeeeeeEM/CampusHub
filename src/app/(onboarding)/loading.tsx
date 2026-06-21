import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function OnboardingLoading() {
  return (
    <PageLoadingState
      title="Loading onboarding"
      description="Fetching your university and account setup progress."
      withSidebar={false}
    />
  );
}
