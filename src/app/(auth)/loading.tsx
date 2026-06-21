import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function AuthLoading() {
  return (
    <PageLoadingState
      title="Loading secure access"
      description="Preparing the authentication form and account checks."
      withSidebar={false}
    />
  );
}
