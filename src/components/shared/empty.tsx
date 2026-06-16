import type { IconType } from "react-icons";
import { FiFilter, FiInbox } from "react-icons/fi";

import { cn } from "@/lib/utils";

type EmptyProps = {
  title?: string;
  description?: string;
  filterName?: string;
  icon?: IconType;
  className?: string;
};

export function Empty({
  title,
  description,
  filterName,
  icon: Icon,
  className,
}: EmptyProps) {
  const ResolvedIcon = Icon ?? (filterName ? FiFilter : FiInbox);
  const resolvedTitle =
    title ??
    (filterName
      ? `No data for the filter "${filterName}"`
      : "No data available");
  const resolvedDescription =
    description ??
    (filterName
      ? "Try another filter or clear your search to view more results."
      : "There is nothing to show yet.");

  return (
    <div
      className={cn(
        "flex min-h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/70 p-10 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ResolvedIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        {resolvedTitle}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {resolvedDescription}
      </p>
    </div>
  );
}
