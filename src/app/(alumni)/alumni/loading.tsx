import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function AlumniLoading() {
  return (
    <PageLoadingState
      title="Loading Alumni workspace"
      description="Fetching alumni profile, mentorship, events, and university updates."
      withSidebar={false}
    />
  );
}
