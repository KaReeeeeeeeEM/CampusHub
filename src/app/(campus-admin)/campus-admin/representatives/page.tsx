import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { RepresentativesManagement } from "@/features/campus-admin/components/representatives/representatives-management";
import {
  mockColleges,
  mockRepresentatives,
} from "@/features/campus-admin/lib/mock-data";

export default async function CampusAdminRepresentativesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CampusAdminPageHeader
        eyebrow="College leadership"
        title="Representatives"
        description="Invite and manage college representatives. Representative accounts are activated through invitation links."
      />
      <RepresentativesManagement
        colleges={mockColleges}
        initialInvitations={mockRepresentatives}
      />
    </main>
  );
}
