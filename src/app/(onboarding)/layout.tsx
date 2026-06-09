import { AppShell } from "@/components/layout/app-shell";
import { requireOnboarding } from "@/lib/auth/route-guards";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboarding();

  return <AppShell>{children}</AppShell>;
}
