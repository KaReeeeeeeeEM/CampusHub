import { CampusAdminLayout } from "@/features/campus-admin/components/campus-admin-layout";

export default async function CampusAdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CampusAdminLayout
      user={{
        id: "mock-campus-admin",
        name: "Dr. Catherine Simba",
        email: "campus.admin@udsm.ac.tz",
        role: "CAMPUS_ADMIN",
        roles: ["CAMPUS_ADMIN"],
        universityId: "udsm",
        onboardingCompleted: true,
      }}
    >
      {children}
    </CampusAdminLayout>
  );
}
