"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function CampusAdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex w-full max-w-none items-center justify-center px-4 py-6 sm:px-6">
      <ErrorState
        title="Unable to load Campus Admin"
        description="CampusHub could not load this university workspace."
        actionLabel="Try again"
        onAction={reset}
        className="max-w-none"
      />
    </main>
  );
}
