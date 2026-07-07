import { SpinnerLoader } from "@/components/shared/spinner-loader";
import { cn } from "@/lib/utils";

type CenteredSpinnerProps = {
  label?: string;
  className?: string;
};

export function CenteredSpinner({
  label = "Loading",
  className,
}: CenteredSpinnerProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex min-h-screen items-center justify-center bg-background text-foreground",
        className,
      )}
    >
      <SpinnerLoader label={label} />
    </div>
  );
}
