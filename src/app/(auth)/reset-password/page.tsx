import { Suspense } from "react";

import { LoadingState } from "@/components/shared/loading-state";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Reset password"
      title="Create a new secure password."
      description="Use the reset link from your email to set a new CampusHub password."
    >
      <Suspense fallback={<LoadingState label="Loading reset form" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
