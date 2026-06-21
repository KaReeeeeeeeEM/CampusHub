import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function EmployerLoading() {
  return (
    <PageLoadingState
      title="Loading Employer workspace"
      description="Fetching employer profile, opportunities, talent matches, and notifications."
      withSidebar={false}
    />
  );
}
