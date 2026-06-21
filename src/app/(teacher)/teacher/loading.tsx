import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function TeacherLoading() {
  return (
    <PageLoadingState
      title="Loading Teacher workspace"
      description="Fetching university profile, almanac, notifications, and academic activity."
      withSidebar={false}
    />
  );
}
