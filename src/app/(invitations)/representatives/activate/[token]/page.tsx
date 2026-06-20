import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { InvitedAccountActivationForm } from "@/features/invitations/components/invited-account-activation-form";
import { resolveInvitation } from "@/features/invitations/lib/invitation-service";

type RepresentativeActivationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function RepresentativeActivationPage({
  params,
}: RepresentativeActivationPageProps) {
  const { token } = await params;
  const resolution = await resolveInvitation(token);
  const invitation =
    "invitation" in resolution ? resolution.invitation : undefined;

  if (
    resolution.status !== "valid" ||
    invitation?.type !== "REPRESENTATIVE_INVITATION"
  ) {
    return (
      <AuthShell
        eyebrow="Representative activation"
        title={
          resolution.status === "expired"
            ? "Activation link expired."
            : "Invalid activation link."
        }
        description="Request a new representative invitation from your Campus Admin."
      >
        <Button asChild className="w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Representative activation"
      title="Activate your Representative account."
      description="Create your CampusHub account. This one-time link will assign you to the invited college."
    >
      <InvitedAccountActivationForm
        token={token}
        submitLabel="Activate Representative account"
      />
    </AuthShell>
  );
}
