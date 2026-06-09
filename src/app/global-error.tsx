"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <ErrorState
            title="Application error"
            description={error.message || "CampusHub could not recover."}
            actionLabel="Try again"
            onAction={reset}
          />
        </main>
      </body>
    </html>
  );
}
