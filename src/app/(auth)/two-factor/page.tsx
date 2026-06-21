import { AuthShell } from "@/features/auth/components/auth-shell";
import { TwoFactorForm } from "@/features/auth/components/two-factor-form";

export default function TwoFactorPage() {
  return (
    <AuthShell
      eyebrow="Account security"
      title="Two-factor verification"
      description="Use your authenticator app to finish signing in."
    >
      <TwoFactorForm />
    </AuthShell>
  );
}
