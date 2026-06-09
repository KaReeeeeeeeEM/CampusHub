import Link from "next/link";

import { AuthAlert } from "@/features/auth/components/auth-alert";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { Button } from "@/components/ui/button";

type VerificationSuccessPageProps = {
  searchParams: Promise<{
    email?: string;
    verified?: string;
  }>;
};

export default async function VerificationSuccessPage({
  searchParams
}: VerificationSuccessPageProps) {
  const params = await searchParams;
  const verified = params.verified === "true";

  return (
    <AuthShell
      eyebrow="Verification"
      title={verified ? "Email verified successfully." : "Check your email."}
      description={
        verified
          ? "Your email address has been verified. You can now login to CampusHub."
          : "We sent a verification link to your email address. Follow the link to activate your account."
      }
    >
      <div className="space-y-5">
        <AuthAlert
          type="success"
          message={
            verified
              ? "Your CampusHub account is ready for login."
              : `Verification instructions have been sent${params.email ? ` to ${params.email}` : ""}.`
          }
        />
        <Button asChild className="w-full">
          <Link href="/login">Go to login</Link>
        </Button>
        <Button asChild className="w-full" variant="secondary">
          <Link href="/verify-email">Resend verification email</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
