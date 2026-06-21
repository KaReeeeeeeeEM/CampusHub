import { PageLoadingState } from "@/components/shared/page-loading-state";

export default function InvitationsLoading() {
  return (
    <PageLoadingState
      title="Loading invitation"
      description="Validating the invitation and preparing the activation form."
      withSidebar={false}
    />
  );
}
