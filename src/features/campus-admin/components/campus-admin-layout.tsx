import { CampusAdminSidebar } from "@/features/campus-admin/components/campus-admin-sidebar";
import { CampusAdminTopbar } from "@/features/campus-admin/components/campus-admin-topbar";
import type { AuthUser } from "@/types/auth";

type CampusAdminLayoutProps = {
  user: AuthUser;
  children: React.ReactNode;
};

export function CampusAdminLayout({ user, children }: CampusAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <CampusAdminSidebar />
        <div className="min-w-0 flex-1">
          <CampusAdminTopbar user={user} />
          {children}
        </div>
      </div>
    </div>
  );
}
