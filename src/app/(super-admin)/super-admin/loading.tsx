import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function SuperAdminLoading() {
  return (
    <PageLoadingState
      title="Loading Super Admin workspace"
      description="Fetching platform metrics, universities, users, and applications."
    />
  );
}
