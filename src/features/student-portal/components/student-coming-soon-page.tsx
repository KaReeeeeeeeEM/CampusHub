import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { StudentNavItem } from "@/features/student-portal/lib/navigation";

type StudentComingSoonPageProps = {
  item: StudentNavItem;
};

export function StudentComingSoonPage({ item }: StudentComingSoonPageProps) {
  const Icon = item.icon;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="w-full rounded-lg border border-border bg-surface p-6 shadow-sm lg:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-normal text-primary">
          Coming soon
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          {item.label}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {item.description} This route is reserved in the student portal
          architecture and will be connected when the module is implemented.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/student/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/portal-selection">Switch portal</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
