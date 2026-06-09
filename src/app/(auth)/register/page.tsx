import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Account creation"
      title="Public registration is closed."
      description="CampusHub accounts are created through authorized onboarding paths: student invitations, institution-issued staff invitations, Super Admin invitations, and approved employer applications."
    >
      <div className="grid gap-3">
        <Button asChild>
          <Link href="/login">Go to login</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/employers/apply">Employer application</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
