import { AppearanceDrawer } from "@/components/navigation/appearance-drawer";
import { DashboardThemeToggle } from "@/components/navigation/theme-toggle";
import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UniversityScopeBadge } from "@/components/navigation/university-scope-badge";
import { UserMenu } from "@/components/navigation/user-menu";
import { CommitteeBreadcrumbs } from "@/features/committee-member/components/committee-breadcrumbs";
import { CommitteeMobileMenu } from "@/features/committee-member/components/committee-mobile-menu";
import type { AuthUser } from "@/types/auth";

type CommitteeTopbarProps = {
  user: AuthUser;
};

function getUserName(user: AuthUser) {
  return (
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

export function CommitteeTopbar({ user }: CommitteeTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6">
      <CommitteeMobileMenu />
      <CommitteeBreadcrumbs />
      <UniversityScopeBadge
        universityId={user.universityId}
        className="hidden min-w-0 lg:flex"
      />
      <Search
        className="ml-0 max-w-md md:ml-4"
        placeholder="Search technology work"
      />
      <div className="ml-auto flex items-center gap-1">
        <AppearanceDrawer />
        <DashboardThemeToggle />
        <NotificationMenu />
        <UserMenu name={getUserName(user)} email={user.email} />
      </div>
    </header>
  );
}
