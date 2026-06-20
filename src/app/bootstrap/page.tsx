import { redirect } from "next/navigation";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { SuperAdminBootstrapForm } from "@/features/bootstrap/components/super-admin-bootstrap-form";
import { isSuperAdminBootstrapEnabled } from "@/features/bootstrap/lib/bootstrap-service";

export const dynamic = "force-dynamic";

export default async function BootstrapPage() {
  const enabled = await isSuperAdminBootstrapEnabled();

  if (!enabled) {
    redirect("/login");
  }

  return (
    <AuthShell
      eyebrow="First-run setup"
      title="Create the first Super Admin."
      description="Bootstrap CampusHub with the initial platform administrator account."
    >
      <SuperAdminBootstrapForm />
    </AuthShell>
  );
}
