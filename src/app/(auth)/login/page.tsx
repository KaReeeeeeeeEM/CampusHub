import { Suspense } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { LoadingState } from "@/components/shared/loading-state";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure login"
      title="Welcome back to CampusHub."
      description="Access your CampusHub account with your verified email and password."
    >
      <Suspense fallback={<LoadingState label="Loading login form" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
