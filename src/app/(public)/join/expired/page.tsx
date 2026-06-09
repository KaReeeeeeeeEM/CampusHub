import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ExpiredInvitationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-24 text-foreground">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">
          Invitation expired
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal">
          This invitation has expired.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Ask your college representative to generate a new CampusHub invitation
          link for your student enrollment.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </main>
  );
}
