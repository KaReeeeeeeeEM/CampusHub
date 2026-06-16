import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  futureStudentNavigationItems,
  studentNavigationItems,
} from "@/features/student-portal/lib/navigation";

export function StudentDashboardFoundation() {
  return (
    <div className="w-full max-w-none space-y-6 px-4 py-6 sm:px-6">
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm lg:p-8">
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">
          Student portal
        </p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              Student workspace foundation.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The portal shell, navigation, search, breadcrumbs, and
              notification area are ready for future student modules.
            </p>
          </div>
          <Button asChild>
            <Link href="/portal-selection">Switch portal</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {studentNavigationItems.slice(0, 3).map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.key}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Future modules</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Navigation routes are reserved and ready for implementation.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {futureStudentNavigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.key}
                className="group rounded-lg border border-border bg-background p-5 transition-colors hover:border-primary/60"
                href={item.href}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold transition-colors group-hover:text-primary">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
