import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/features/authorization/roles";
import { requirePortalAccess } from "@/features/portal-selection/lib/portal-preferences-service";
import {
  getPortalByKey,
  isPortalKey,
} from "@/features/portal-selection/lib/portals";

type PortalShellPageProps = {
  params: Promise<{
    portal: string;
  }>;
};

export default async function PortalShellPage({
  params,
}: PortalShellPageProps) {
  const { portal } = await params;

  if (!isPortalKey(portal)) {
    notFound();
  }

  if (portal === "student") {
    redirect("/student/dashboard");
  }

  if (portal === "employer") {
    redirect("/employer/dashboard");
  }

  await requirePortalAccess(portal);

  const definition = getPortalByKey(portal);

  if (!definition) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-border bg-surface p-6 shadow-sm lg:p-8">
        <p className="text-sm font-semibold uppercase tracking-normal text-primary">
          {definition.roleLabel} portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">
          {definition.title} portal foundation.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Role routing is active for this portal. The shell is reserved for the
          future {definition.roleLabel.toLowerCase()} workspace without
          implementing dashboard modules yet.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {definition.requiredRoles.map((role) => (
            <span
              key={role}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              {ROLE_LABELS[role]}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/student/dashboard">Student dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
