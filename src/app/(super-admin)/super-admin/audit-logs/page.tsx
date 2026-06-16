import { SuperAdminAuditLogs } from "@/features/super-admin/components/audit-logs/super-admin-audit-logs";
import { SuperAdminPageHeader } from "@/features/super-admin/components/super-admin-page-header";

export default function SuperAdminAuditLogsPage() {
  return (
    <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
      <SuperAdminPageHeader
        eyebrow="Governance"
        title="Audit Logs"
        description="Enterprise platform activity monitoring with heatmaps, trends, distribution analytics, and detailed recent log inspection."
      />
      <SuperAdminAuditLogs />
    </main>
  );
}
