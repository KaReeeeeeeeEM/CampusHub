import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function AppDashboardLoading() {
  return (
    <PageLoadingState
      title="Loading workspace"
      description="Fetching your CampusHub workspace data."
      withSidebar={false}
    />
  );
}
