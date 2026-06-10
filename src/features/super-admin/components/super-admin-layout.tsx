import { SuperAdminSidebar } from "@/features/super-admin/components/super-admin-sidebar";
import { SuperAdminTopbar } from "@/features/super-admin/components/super-admin-topbar";
import type { AuthUser } from "@/types/auth";

type SuperAdminLayoutProps = {
  user: AuthUser;
  children: React.ReactNode;
};

export function SuperAdminLayout({ user, children }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <SuperAdminSidebar />
        <div className="min-w-0 flex-1">
          <SuperAdminTopbar user={user} />
          {children}
        </div>
      </div>
    </div>
  );
}
