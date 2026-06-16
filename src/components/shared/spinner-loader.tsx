import { cn } from "@/lib/utils";

type SpinnerLoaderProps = {
  label?: string;
  className?: string;
};

export function SpinnerLoader({
  label = "Loading",
  className,
}: SpinnerLoaderProps) {
  return (
    <span className="inline-flex items-center justify-center">
      <span className={cn("loader", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
