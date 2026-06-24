import { PublicLogo } from "@/components/public/public-logo";
import { Skeleton } from "@/components/shared/skeleton";
import { publicNavItems } from "@/features/public-site/content";

export function PublicLoadingState() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="public-brand-surface min-h-screen bg-background text-foreground"
    >
      <header className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:h-24 sm:px-6 lg:px-8">
        <PublicLogo />
        <nav
          aria-label="Loading public navigation"
          className="ml-8 hidden items-center gap-2 lg:flex"
        >
          {publicNavItems.slice(0, 7).map((item) => (
            <Skeleton
              key={item.href}
              className="h-8 w-20 rounded-md bg-muted/70"
            />
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Skeleton className="h-10 w-20 rounded-md bg-muted/70" />
          <Skeleton className="h-10 w-36 rounded-md bg-muted/70" />
        </div>
        <Skeleton className="ml-auto h-10 w-10 rounded-md bg-muted/70 lg:hidden" />
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col px-4 pb-12 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,1fr)] lg:py-16">
          <div className="space-y-8">
            <Skeleton className="h-4 w-28 rounded-full bg-muted/70" />
            <div className="space-y-4">
              <Skeleton className="h-14 w-full max-w-[620px] rounded-md bg-muted/70" />
              <Skeleton className="h-14 w-11/12 max-w-[560px] rounded-md bg-muted/70" />
              <Skeleton className="h-5 w-full max-w-[640px] rounded-md bg-muted/70" />
              <Skeleton className="h-5 w-4/5 max-w-[520px] rounded-md bg-muted/70" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-12 w-40 rounded-md bg-muted/70" />
              <Skeleton className="h-12 w-36 rounded-md bg-muted/70" />
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-md border border-border/70 bg-card/50 p-4"
                >
                  <Skeleton className="mb-3 h-8 w-16 rounded-md bg-muted/70" />
                  <Skeleton className="h-3 w-full rounded-md bg-muted/70" />
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[380px] overflow-hidden rounded-md border border-border bg-card">
            <Skeleton className="absolute inset-0 rounded-none bg-muted/70" />
            <div className="absolute inset-x-6 bottom-6 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-md bg-background/80" />
              <Skeleton className="h-24 rounded-md bg-background/80" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-md border border-border bg-card/70 p-6"
            >
              <Skeleton className="mb-8 h-10 w-10 rounded-md bg-muted/70" />
              <Skeleton className="mb-3 h-5 w-2/3 rounded-md bg-muted/70" />
              <Skeleton className="h-4 w-full rounded-md bg-muted/70" />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
