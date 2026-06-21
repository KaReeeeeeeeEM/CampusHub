import { FiInbox } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { KiboEmptyState } from "@/lib/kibo";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const normalized = `${title} ${description ?? ""}`.toLowerCase();
  const kiboMood = normalized.includes("project")
    ? "curious"
    : normalized.includes("product") || normalized.includes("marketplace")
      ? "thinking"
      : normalized.includes("notification") ||
          normalized.includes("caught up") ||
          normalized.includes("nothing new")
        ? "happy"
        : null;

  if (kiboMood) {
    return (
      <KiboEmptyState
        mood={kiboMood}
        title={title}
        description={description}
        actionLabel={actionLabel}
        onAction={onAction}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-8 text-center",
        className,
      )}
    >
      <div className="mb-4 rounded-full border border-border bg-background p-3">
        <FiInbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-6" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
