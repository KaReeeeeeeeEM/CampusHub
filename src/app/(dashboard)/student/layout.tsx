import { StudentLayout } from "@/features/student-portal/components/student-layout";
import { requireRole } from "@/lib/auth/route-guards";

export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["STUDENT"]);

  return <StudentLayout user={session.user}>{children}</StudentLayout>;
}
