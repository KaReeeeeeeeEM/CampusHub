"use client";

import { Sidebar } from "@/components/navigation/sidebar";
import { Topbar } from "@/components/navigation/topbar";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useNavigationStore((state) => state.sidebarOpen);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar />
      </div>
      <div className="lg:pl-72">
        <Topbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
