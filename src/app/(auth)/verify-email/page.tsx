import { Suspense } from "react";

import { LoadingState } from "@/components/shared/loading-state";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify your CampusHub email."
      description="Verify your email address or request a new verification message."
    >
      <Suspense fallback={<LoadingState label="Loading verification form" />}>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
