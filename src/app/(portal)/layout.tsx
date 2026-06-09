import { AppShell } from "@/components/layout/app-shell";
import { requireCompletedOnboarding } from "@/lib/auth/route-guards";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompletedOnboarding();

  return <AppShell>{children}</AppShell>;
}
