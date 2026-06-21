import Link from "next/link";
import { FiRefreshCw, FiWifiOff } from "react-icons/fi";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-16 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FiWifiOff className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">CampusHub is offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your device is not connected right now. Cached dashboard pages may
          still open, and pending changes will sync when the connection returns.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">
              Open CampusHub
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/offline">
              <FiRefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
