import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function StudentLoading() {
  return (
    <PageLoadingState
      title="Loading Student workspace"
      description="Fetching announcements, events, almanac activities, and campus updates."
      withSidebar={false}
    />
  );
}
