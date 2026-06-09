import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function JoinSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-24 text-foreground">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">
          Account created
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal">
          Your student account is ready.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Check your email for verification, then sign in to continue toward
          onboarding completion.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/verify-email">Verify email</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
