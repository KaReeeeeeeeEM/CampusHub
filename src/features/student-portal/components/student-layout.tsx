"use client";

import { StudentSidebar } from "@/features/student-portal/components/student-sidebar";
import { StudentTopNavigation } from "@/features/student-portal/components/student-top-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/store/navigation-store";

type StudentLayoutProps = {
  children: React.ReactNode;
};

export function StudentLayout({ children }: StudentLayoutProps) {
  const sidebarOpen = useNavigationStore((state) => state.sidebarOpen);
  const setSidebarOpen = useNavigationStore((state) => state.setSidebarOpen);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <StudentSidebar />
      </div>
      {sidebarOpen ? (
        <Button
          aria-label="Close student navigation"
          className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-background/70 p-0 backdrop-blur-sm hover:bg-background/70 lg:hidden"
          type="button"
          variant="ghost"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="lg:pl-72">
        <StudentTopNavigation />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
