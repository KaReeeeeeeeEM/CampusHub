import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function PortalLoading() {
  return (
    <PageLoadingState
      title="Loading portal"
      description="Fetching your available roles and portal preferences."
      withSidebar={false}
    />
  );
}
