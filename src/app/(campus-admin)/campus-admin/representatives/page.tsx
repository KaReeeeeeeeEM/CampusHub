import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { RepresentativesManagement } from "@/features/campus-admin/components/representatives/representatives-management";
import {
  getCourses,
  getRepresentativeInvitations,
} from "@/features/campus-admin/lib/campus-admin-service";

export default async function CampusAdminRepresentativesPage() {
  const [courses, invitations] = await Promise.all([
    getCourses(),
    getRepresentativeInvitations(),
  ]);

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="College leadership"
        title="Representatives"
        description="Invite and manage college representatives. Representative accounts are activated through invitation links."
      />
      <RepresentativesManagement
        courses={courses}
        initialInvitations={invitations}
      />
    </main>
  );
}
