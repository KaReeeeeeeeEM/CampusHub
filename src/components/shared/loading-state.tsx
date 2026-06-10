import { FiLoader } from "react-icons/fi";

import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({
  label = "Loading",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 p-6 text-sm text-muted-foreground",
        className,
      )}
    >
      <FiLoader
        className="h-4 w-4 animate-spin text-primary"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
