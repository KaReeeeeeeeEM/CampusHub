import { CommitteeSidebar } from "@/features/committee-member/components/committee-sidebar";
import { CommitteeTopbar } from "@/features/committee-member/components/committee-topbar";

export function CommitteeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <CommitteeSidebar />
        <div className="min-w-0 flex-1">
          <CommitteeTopbar />
          {children}
        </div>
      </div>
    </div>
  );
}
