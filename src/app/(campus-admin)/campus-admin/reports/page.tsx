import { CampusAdminPageHeader } from "@/features/campus-admin/components/campus-admin-page-header";
import { AdminReportsDashboard } from "@/features/reports/components/admin-reports-dashboard";
import { getCampusAdminReports } from "@/features/reports/lib/admin-reports-service";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CampusAdminReportsPage({
  searchParams,
}: ReportsPageProps) {
  const params = searchParams ? await searchParams : {};
  const reports = await getCampusAdminReports(params);

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <CampusAdminPageHeader
        eyebrow="Analytics"
        title="Reports"
        description="University-specific reporting for students, colleges, departments, communities, events, marketplace, employability, and governance."
      />
      <AdminReportsDashboard data={reports} basePath="/campus-admin/reports" />
    </main>
  );
}
