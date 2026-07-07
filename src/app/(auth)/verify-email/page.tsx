import { Suspense } from "react";

import { CenteredSpinner } from "@/components/shared/centered-spinner";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your CampusHub email."
      description="Verify your email address or request a new verification message."
    >
      <Suspense
        fallback={
          <CenteredSpinner
            label="Loading verification form"
            className="min-h-40 bg-transparent"
          />
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
