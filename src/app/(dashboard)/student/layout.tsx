import { StudentLayout } from "@/features/student-portal/components/student-layout";

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentLayout>{children}</StudentLayout>;
}
