import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UserMenu } from "@/components/navigation/user-menu";
import { CampusAdminBreadcrumbs } from "@/features/campus-admin/components/campus-admin-breadcrumbs";
import { CampusAdminMobileMenu } from "@/features/campus-admin/components/campus-admin-mobile-menu";
import type { AuthUser } from "@/types/auth";

type CampusAdminTopbarProps = {
  user: AuthUser;
};

export function CampusAdminTopbar({ user }: CampusAdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6">
      <CampusAdminMobileMenu />
      <CampusAdminBreadcrumbs />
      <Search className="ml-0 max-w-md md:ml-4" placeholder="Search campus" />
      <div className="ml-auto flex items-center gap-1">
        <NotificationMenu />
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
