import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset access to your account."
      description="Enter your email address and CampusHub will send password reset instructions if an account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
