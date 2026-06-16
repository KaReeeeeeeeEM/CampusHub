import { getEmployerApplications } from "@/features/employer-applications/lib/employer-application-service";
import {
  EmployerApplicationsManagement,
  type EmployerApplicationRow,
} from "@/features/super-admin/components/employer-applications/employer-applications-management";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";

function serializeApplication(
  application: Record<string, unknown>,
): EmployerApplicationRow {
  return {
    id: String(application._id),
    companyName: String(application.companyName),
    industry: String(application.industry),
    companySize: String(application.companySize),
    website: (application.website as string | null) ?? null,
    contactPerson: String(application.contactPerson),
    position: String(application.position),
    email: String(application.email),
    phone: String(application.phone),
    country: String(application.country),
    reasonForJoining: String(application.reasonForJoining),
    status:
      (application.status as EmployerApplicationRow["status"]) ?? "PENDING",
    reviewNotes: (application.reviewNotes as string | null) ?? null,
    createdAt:
      application.createdAt instanceof Date
        ? application.createdAt.toISOString()
        : null,
  };
}

export default async function SuperAdminEmployerApplicationsPage() {
  const applications = await getEmployerApplications();
  const rows = applications.map((application) =>
    serializeApplication(application as Record<string, unknown>),
  );

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Employer ecosystem"
        title="Employer Applications"
        description="Review employer applications before account activation invitations are generated."
      />
      <EmployerApplicationsManagement initialApplications={rows} />
    </main>
  );
}
