"use client";

import { Menu } from "lucide-react";

import { NotificationMenu } from "@/components/navigation/notification-menu";
import { Search } from "@/components/navigation/search";
import { UserMenu } from "@/components/navigation/user-menu";
import { Button } from "@/components/ui/button";
import { useNavigationStore } from "@/store/navigation-store";

export function Topbar() {
  const toggleSidebar = useNavigationStore((state) => state.toggleSidebar);

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
      <Button
        aria-label="Toggle sidebar"
        className="lg:hidden"
        size="icon"
        variant="ghost"
        onClick={toggleSidebar}
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Search className="max-w-md" placeholder="Search CampusHub" />
      <div className="ml-auto flex items-center gap-1">
        <NotificationMenu />
        <UserMenu />
      </div>
    </header>
  );
}
