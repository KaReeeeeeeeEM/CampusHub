import { cn } from "@/lib/utils";

type PageContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: "default" | "wide" | "full";
};

const sizeClasses = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none"
};

export function PageContainer({
  className,
  size = "default",
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8", sizeClasses[size], className)}
      {...props}
    />
  );
}
