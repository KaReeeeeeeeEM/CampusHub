import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { CenteredSpinner } from "@/components/shared/centered-spinner";
import { isSuperAdminBootstrapEnabled } from "@/features/bootstrap/lib/bootstrap-service";
import { redirectAuthenticatedUser } from "@/lib/auth/route-guards";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  const bootstrapEnabled = await isSuperAdminBootstrapEnabled();

  if (bootstrapEnabled) {
    redirect("/bootstrap");
  }

  return (
    <AuthShell
      eyebrow="Secure login"
      title="Welcome back to CampusHub."
      description="Access your CampusHub account with your verified email and password."
    >
      <Suspense
        fallback={
          <CenteredSpinner
            label="Loading login form"
            className="min-h-40 bg-transparent"
          />
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
