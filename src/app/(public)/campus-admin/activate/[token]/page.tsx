import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { CampusAdminActivationForm } from "@/features/super-admin/components/activation/campus-admin-activation-form";
import { resolveCampusAdminActivation } from "@/features/super-admin/lib/super-admin-service";

type CampusAdminActivationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function CampusAdminActivationPage({
  params,
}: CampusAdminActivationPageProps) {
  const { token } = await params;
  const resolution = await resolveCampusAdminActivation(token);

  if (resolution.status !== "valid") {
    return (
      <AuthShell
        eyebrow="Campus Admin activation"
        title={
          resolution.status === "expired"
            ? "Activation link expired."
            : "Invalid activation link."
        }
        description="Request a new Campus Admin invitation from the CampusHub Super Admin."
      >
        <Button asChild className="w-full">
          <Link href="/login">Back to login</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Campus Admin activation"
      title="Activate your Campus Admin account."
      description={`Create secure access for ${resolution.university.name}. Your account will be linked to this university.`}
    >
      <CampusAdminActivationForm token={token} />
    </AuthShell>
  );
}
