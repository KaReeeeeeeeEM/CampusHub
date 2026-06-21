import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function CampusAdminLoading() {
  return (
    <PageLoadingState
      title="Loading Campus Admin workspace"
      description="Fetching university operations, colleges, departments, and invitations."
      withSidebar={false}
    />
  );
}
