import { RepresentativeLayout } from "@/features/representative/components/representative-layout";
import { requireStudentLeadershipPosition } from "@/lib/auth/route-guards";
import type { AuthUser } from "@/types/auth";

const mockRepresentativeUser: AuthUser = {
  id: "mock-representative",
  name: "Neema Sanga",
  email: "representative@coict.udsm.ac.tz",
  role: "STUDENT",
  roles: ["STUDENT"],
  studentLeadershipPositions: ["REPRESENTATIVE"],
  universityId: "udsm",
  collegeId: "coict",
  onboardingCompleted: true,
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudentLeadershipPosition("REPRESENTATIVE");

  return (
    <RepresentativeLayout user={mockRepresentativeUser}>
      {children}
    </RepresentativeLayout>
  );
}
