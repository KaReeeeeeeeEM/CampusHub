import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function RepresentativeLoading() {
  return (
    <PageLoadingState
      title="Loading Representative workspace"
      description="Fetching representative profile, students, polls, and university activity."
      withSidebar={false}
    />
  );
}
