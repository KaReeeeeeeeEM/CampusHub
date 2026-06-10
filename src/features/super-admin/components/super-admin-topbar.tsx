import Link from "next/link";

import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { SuperAdminBreadcrumbs } from "@/features/super-admin/components/super-admin-breadcrumbs";
import { SuperAdminMobileMenu } from "@/features/super-admin/components/super-admin-mobile-menu";
import type { AuthUser } from "@/types/auth";

type SuperAdminTopbarProps = {
  user: AuthUser;
};

export function SuperAdminTopbar({ user }: SuperAdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6">
      <SuperAdminMobileMenu />
      <SuperAdminBreadcrumbs />
      <Search className="ml-0 max-w-md md:ml-4" placeholder="Search platform" />
      <div className="ml-auto flex items-center gap-1">
        <Button asChild className="hidden sm:inline-flex" variant="secondary">
          <Link href="/super-admin/universities">Manage Universities</Link>
        </Button>
        <NotificationMenu />
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
