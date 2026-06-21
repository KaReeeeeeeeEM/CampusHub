import { Skeleton } from "@/components/shared/skeleton";
import { cn } from "@/lib/utils";

type PageLoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
  withSidebar?: boolean;
};

export function PageLoadingState({
  title = "Loading workspace",
  description = "Preparing the latest CampusHub data.",
  className,
  withSidebar = true,
}: PageLoadingStateProps) {
  const content = (
    <section
      className={cn("space-y-6 px-4 py-6 sm:px-6 lg:px-8", className)}
      aria-busy="true"
      aria-label={title}
    >
      <span className="sr-only">
        {title}. {description}
      </span>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-full max-w-xl sm:h-9" />
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-2/3 max-w-xl" />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="inline-flex max-w-full rounded-full border border-border bg-surface p-1">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="ml-1 h-10 w-24 rounded-full" />
        <Skeleton className="ml-1 hidden h-10 w-24 rounded-full sm:block" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="mt-8 space-y-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-12 w-full sm:max-w-sm" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background/60">
          <div className="grid grid-cols-4 gap-4 border-b border-border px-5 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 px-5 py-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  if (!withSidebar) {
    return content;
  }

  return (
    <div className="dashboard-shell min-h-screen text-foreground">
      <div className="flex min-h-screen">
        <aside
          className="dashboard-sidebar hidden h-screen w-64 shrink-0 border-r border-border p-3 lg:sticky lg:top-0 lg:flex lg:flex-col"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="flex h-11 items-center gap-3 rounded-md px-3"
              >
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton
                  className={cn(
                    "h-4",
                    index % 3 === 0 ? "w-28" : index % 2 === 0 ? "w-24" : "w-32",
                  )}
                />
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-lg border border-border bg-surface p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:p-2">
          <div className="dashboard-app-frame">
            <header className="dashboard-topbar sticky top-0 z-30 flex h-14 items-center border-b border-border">
              <div className="flex h-full w-14 shrink-0 items-center justify-center border-r border-border">
                <Skeleton className="h-9 w-9" />
              </div>
              <div className="hidden h-full items-center gap-2 border-r border-border px-4 md:flex">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="mx-3 hidden h-9 w-48 md:block" />
              <Skeleton className="ml-auto hidden h-10 max-w-sm flex-1 lg:block" />
              <div className="flex items-center gap-2 px-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">{content}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
