import { LoadingState } from "@/components/shared/loading-state";

export default function CampusAdminLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <LoadingState
        label="Loading Campus Admin workspace"
        className="min-h-80 rounded-lg border border-border bg-surface"
      />
    </main>
  );
}
