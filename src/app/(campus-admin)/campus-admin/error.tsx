"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function CampusAdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
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
