import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function CommitteeMemberLoading() {
  return (
    <PageLoadingState
      title="Loading Committee workspace"
      description="Fetching committee membership, reports, meetings, and university activity."
      withSidebar={false}
    />
  );
}
