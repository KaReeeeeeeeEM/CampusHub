import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/auth/route-guards";

export default async function PortalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return <AppShell>{children}</AppShell>;
}
