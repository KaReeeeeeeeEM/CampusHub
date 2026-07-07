import { Suspense } from "react";

import { CenteredSpinner } from "@/components/shared/centered-spinner";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Reset password"
      title="Create a new secure password."
      description="Use the reset link from your email to set a new CampusHub password."
    >
      <Suspense
        fallback={
          <CenteredSpinner
            label="Loading reset form"
            className="min-h-40 bg-transparent"
          />
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
