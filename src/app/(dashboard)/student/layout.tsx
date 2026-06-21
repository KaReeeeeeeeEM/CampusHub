import { AuthReadyGate } from "@/components/auth/auth-ready-gate";
import { StudentLayout } from "@/features/student-portal/components/student-layout";
import { requireRole } from "@/lib/auth/route-guards";

export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["STUDENT"]);

  return (
    <AuthReadyGate
      title="Loading Student workspace"
      description="Fetching your account, role, and university details."
    >
      <StudentLayout user={session.user}>{children}</StudentLayout>
    </AuthReadyGate>
  );
}
