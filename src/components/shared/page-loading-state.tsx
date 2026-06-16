import { SpinnerLoader } from "@/components/shared/spinner-loader";
import { cn } from "@/lib/utils";

type PageLoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function PageLoadingState({
  title = "Loading workspace",
  description = "Preparing the latest CampusHub data.",
  className,
}: PageLoadingStateProps) {
  return (
    <main
      className={cn(
        "flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4 py-10 sm:px-6",
        className,
      )}
    >
      <div className="flex flex-col items-center text-center">
        <SpinnerLoader label={title} />
        <h1 className="mt-6 text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </main>
  );
}
