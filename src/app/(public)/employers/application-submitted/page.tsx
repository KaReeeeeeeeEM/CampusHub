import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function EmployerApplicationSubmittedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-24 text-foreground">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">
          Application submitted
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal">
          Your employer application is under review.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          A Super Admin will review the request. If approved, CampusHub will
          generate an activation invitation for the employer account.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/employers">Back to employers</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">Contact CampusHub</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
