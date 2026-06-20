import { AdminReportsDashboard } from "@/features/reports/components/admin-reports-dashboard";
import { getSuperAdminReports } from "@/features/reports/lib/admin-reports-service";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminReportsPage({
  searchParams,
}: ReportsPageProps) {
  const params = searchParams ? await searchParams : {};
  const reports = await getSuperAdminReports(params);

  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Platform-wide reporting for users, universities, marketplace activity, employability, communities, and governance."
      />
      <AdminReportsDashboard data={reports} basePath="/super-admin/reports" />
    </main>
  );
}
