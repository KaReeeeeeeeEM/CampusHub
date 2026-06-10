import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UserMenu } from "@/components/navigation/user-menu";
import { CommitteeBreadcrumbs } from "@/features/committee-member/components/committee-breadcrumbs";
import { CommitteeMobileMenu } from "@/features/committee-member/components/committee-mobile-menu";
import { committeeProfile } from "@/features/committee-member/lib/mock-data";

export function CommitteeTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6">
      <CommitteeMobileMenu />
      <CommitteeBreadcrumbs />
      <Search
        className="ml-0 max-w-md md:ml-4"
        placeholder="Search technology work"
      />
      <div className="ml-auto flex items-center gap-1">
        <NotificationMenu />
        <UserMenu name={committeeProfile.name} email={committeeProfile.email} />
      </div>
    </header>
  );
}
