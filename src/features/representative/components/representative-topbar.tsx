import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UserMenu } from "@/components/navigation/user-menu";
import { RepresentativeBreadcrumbs } from "@/features/representative/components/representative-breadcrumbs";
import { RepresentativeMobileMenu } from "@/features/representative/components/representative-mobile-menu";
import type { AuthUser } from "@/types/auth";

type RepresentativeTopbarProps = {
  user: AuthUser;
};

export function RepresentativeTopbar({ user }: RepresentativeTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6">
      <RepresentativeMobileMenu />
      <RepresentativeBreadcrumbs />
      <Search
        className="ml-0 max-w-md md:ml-4"
        placeholder="Search college"
      />
      <div className="ml-auto flex items-center gap-1">
        <NotificationMenu />
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
