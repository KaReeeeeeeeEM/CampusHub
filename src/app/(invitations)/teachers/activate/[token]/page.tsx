import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { InvitedAccountActivationForm } from "@/features/invitations/components/invited-account-activation-form";
import { resolveInvitation } from "@/features/invitations/lib/invitation-service";

type TeacherActivationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function TeacherActivationPage({
  params,
}: TeacherActivationPageProps) {
  const { token } = await params;
  const resolution = await resolveInvitation(token);
  const invitation =
    "invitation" in resolution ? resolution.invitation : undefined;

  if (
    resolution.status !== "valid" ||
    invitation?.type !== "TEACHER_INVITATION"
  ) {
    return (
      <AuthShell
        eyebrow="Teacher activation"
        title={
          resolution.status === "expired"
            ? "Activation link expired."
            : "Invalid activation link."
        }
        description="Request a new teacher invitation from your Campus Admin."
      >
        <Button asChild className="w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Teacher activation"
      title="Activate your Teacher account."
      description="Create your CampusHub account. This one-time link will assign you to the invited department."
    >
      <InvitedAccountActivationForm
        token={token}
        submitLabel="Activate Teacher account"
      />
    </AuthShell>
  );
}
