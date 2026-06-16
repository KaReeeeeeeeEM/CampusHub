import { SpinnerLoader } from "@/components/shared/spinner-loader";

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
        "flex flex-col items-center justify-center gap-4 p-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      <SpinnerLoader label={label} />
      <span>{label}</span>
    </div>
  );
}
