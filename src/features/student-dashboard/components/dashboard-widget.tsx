import { cn } from "@/lib/utils";

type DashboardWidgetProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardWidget({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: DashboardWidgetProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-surface shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </section>
  );
}
