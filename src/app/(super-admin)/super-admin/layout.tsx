import { SuperAdminLayout } from "@/features/super-admin/components/super-admin-layout";
import { requireRole } from "@/lib/auth/route-guards";

export default async function SuperAdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["SUPER_ADMIN"]);

  return <SuperAdminLayout user={session.user}>{children}</SuperAdminLayout>;
}
