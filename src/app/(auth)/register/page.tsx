import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Join the CampusHub ecosystem."
      description="Create your account and verify your email. Role selection is captured for future assignment and tenant onboarding."
    >
      <RegisterForm />
    </AuthShell>
  );
}
