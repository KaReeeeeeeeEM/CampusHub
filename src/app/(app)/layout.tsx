import { requireCompletedOnboarding } from "@/lib/auth/route-guards";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCompletedOnboarding();

  return <>{children}</>;
}
