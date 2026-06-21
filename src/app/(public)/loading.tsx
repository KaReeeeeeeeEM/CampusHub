import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function PublicLoading() {
  return (
    <PageLoadingState
      title="Loading CampusHub"
      description="Preparing the latest public content."
      withSidebar={false}
    />
  );
}
