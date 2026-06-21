import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function BootstrapLoading() {
  return (
    <PageLoadingState
      title="Loading setup"
      description="Preparing the initial platform bootstrap form."
      withSidebar={false}
    />
  );
}
