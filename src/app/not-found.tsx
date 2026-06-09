import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <EmptyState
        title="Not found"
        description="The requested CampusHub resource does not exist."
      />
    </main>
  );
}
