"use client";

import { FiSidebar } from "react-icons/fi";

import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { useNavigationStore } from "@/store/navigation-store";

export function Topbar() {
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
      <Button
        aria-label="Toggle sidebar"
        className="lg:hidden"
        size="icon"
        variant="ghost"
        onClick={toggleSidebar}
      >
        <FiSidebar className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Search className="max-w-md" placeholder="Search CampusHub" />
      <div className="ml-auto flex items-center gap-1">
        <NotificationMenu />
        <UserMenu name={user?.name} email={user?.email} />
      </div>
    </header>
  );
}
