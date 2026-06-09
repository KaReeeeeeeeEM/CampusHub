import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { EmployerActivationForm } from "@/features/employer-applications/components/employer-activation-form";
import { resolveEmployerActivation } from "@/features/employer-applications/lib/employer-application-service";

type EmployerActivationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function EmployerActivationPage({
  params,
}: EmployerActivationPageProps) {
  const { token } = await params;
  const resolution = await resolveEmployerActivation(token);

  if (resolution.status !== "valid") {
    const title =
      resolution.status === "expired"
        ? "Activation link expired."
        : resolution.status === "used"
          ? "Activation link already used."
          : "Invalid activation link.";

    return (
      <AuthShell
        eyebrow="Employer activation"
        title={title}
        description="Request a new employer activation invitation from CampusHub if your organization has already been approved."
      >
        <Button asChild className="w-full">
          <Link href="/employers/apply">Submit employer application</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Employer activation"
      title="Activate your employer account."
      description={`Create access for ${resolution.application.companyName}. Employer accounts are restricted to the Employer role only.`}
    >
      <EmployerActivationForm token={token} />
    </AuthShell>
  );
}
